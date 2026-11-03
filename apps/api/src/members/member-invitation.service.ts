import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'

import type { VerifiedSubject } from '../auth/identity.types.js'
import { ApplicationAccessService } from '../applications/application-access.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { KeycloakInvitationClient } from './keycloak-invitation.client.js'
import { invitationAudit } from './member-invitation-audit.js'
import { requireAvailableApps } from './member-app-selection.js'
import type { InvitationInput } from './member-input.js'

const INVITATION_LIFETIME_MS = 12 * 60 * 60 * 1000

@Injectable()
export class MemberInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ApplicationAccessService,
    private readonly keycloak: KeycloakInvitationClient,
  ) {}

  async invite(identity: VerifiedSubject, organizationId: string, input: InvitationInput) {
    await this.access.requireAdministrator(identity, organizationId)
    await requireAvailableApps(this.prisma, organizationId, input.applicationKeys)

    const organization = await this.prisma.organization.findUnique({
      select: { keycloakOrganizationId: true },
      where: { id: organizationId },
    })
    if (!organization?.keycloakOrganizationId) {
      throw new NotFoundException('Organization not found')
    }
    const existingSubject = await this.keycloak.findSubjectByEmail(input.email)
    if (existingSubject) {
      const member = await this.prisma.organizationRoleAssignment.findUnique({
        where: { organizationId_subject: { organizationId, subject: existingSubject } },
      })
      if (member) throw new ConflictException('Email already belongs to a member')
    }
    const existing = await this.prisma.memberInvitation.findUnique({
      where: { organizationId_email: { organizationId, email: input.email } },
    })
    if (existing?.status === 'ACCEPTED') {
      throw new ConflictException('Email already belongs to a member')
    }
    if (existing?.status === 'REVOCATION_PENDING') {
      throw new ConflictException('Invitation revocation must finish first')
    }
    if (existing?.status === 'RESENDING') {
      throw new ConflictException('Invitation resend in progress')
    }
    if (existing?.status === 'PENDING' && existing.expiresAt > new Date()) {
      if (
        existing.role !== input.role ||
        [...existing.applicationKeys].sort().join() !== [...input.applicationKeys].sort().join()
      ) {
        throw new ConflictException('Invitation already exists with different access')
      }
    }
    if (existing?.status === 'REVOKED') {
      await this.keycloak.revokeMemberInvitation(organization.keycloakOrganizationId, input.email)
    }

    const data = {
      applicationKeys: input.applicationKeys,
      email: input.email,
      expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
      invitedBy: identity.subject,
      keycloakInvitationId: null,
      organizationId,
      role: input.role,
      status: 'PENDING' as const,
    }
    let invitation = existing
    if (existing && !(existing.status === 'PENDING' && existing.expiresAt > new Date())) {
      const changed = await this.prisma.memberInvitation.updateMany({
        data,
        where: { id: existing.id, status: { in: ['PENDING', 'DELIVERY_FAILED', 'REVOKED'] } },
      })
      if (changed.count !== 1) throw new ConflictException('Invitation no longer available')
      invitation = await this.prisma.memberInvitation.findUnique({ where: { id: existing.id } })
    }
    if (!invitation) invitation = await this.prisma.memberInvitation.create({ data })

    let keycloakInvitationId: string
    try {
      // No client_id: Keycloak's invitation continuation cannot supply the web client's PKCE challenge.
      keycloakInvitationId =
        existing?.status === 'DELIVERY_FAILED' ||
        (existing?.status === 'PENDING' && !existing.keycloakInvitationId)
          ? await this.keycloak.resendMemberInvitation(
              organization.keycloakOrganizationId,
              input.email,
            )
          : await this.keycloak.inviteMember(organization.keycloakOrganizationId, input.email)
    } catch {
      await this.prisma.$transaction(async (transaction) => {
        const failed = await transaction.memberInvitation.updateMany({
          data: { status: 'DELIVERY_FAILED' },
          where: { id: invitation.id, status: 'PENDING' },
        })
        if (failed.count === 1)
          await transaction.auditEvent.create({
            data: invitationAudit(
              identity.subject,
              organizationId,
              invitation.id,
              'INVITE_MEMBER',
              'FAILED',
            ),
          })
      })
      throw new ServiceUnavailableException('Invitation delivery unavailable')
    }
    if (existing?.status === 'PENDING' && existing.keycloakInvitationId === keycloakInvitationId) {
      return invitationView(existing)
    }
    const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS)
    await this.prisma.$transaction(async (transaction) => {
      const confirmed = await transaction.memberInvitation.updateMany({
        data: { keycloakInvitationId, expiresAt },
        where: { id: invitation.id, status: 'PENDING' },
      })
      if (confirmed.count !== 1) throw new ConflictException('Invitation no longer pending')
      await transaction.auditEvent.create({
        data: invitationAudit(
          identity.subject,
          organizationId,
          invitation.id,
          'INVITE_MEMBER',
          'SUCCEEDED',
          { role: input.role, applicationKeys: input.applicationKeys },
        ),
      })
    })
    return invitationView({ ...invitation, expiresAt })
  }
}

function invitationView(invitation: {
  id: string
  email: string
  role: string
  applicationKeys: string[]
  expiresAt: Date
}) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    applicationKeys: invitation.applicationKeys,
    status: 'PENDING' as const,
    expiresAt: invitation.expiresAt,
  }
}
