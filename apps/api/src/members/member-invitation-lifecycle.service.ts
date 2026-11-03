import {
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'

import { ApplicationAccessService } from '../applications/application-access.service.js'
import type { VerifiedSubject } from '../auth/identity.types.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { KeycloakInvitationClient } from './keycloak-invitation.client.js'
import { invitationAudit } from './member-invitation-audit.js'

const INVITATION_LIFETIME_MS = 12 * 60 * 60 * 1000

@Injectable()
export class MemberInvitationLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ApplicationAccessService,
    private readonly keycloak: KeycloakInvitationClient,
  ) {}

  async resend(identity: VerifiedSubject, organizationId: string, invitationId: string) {
    await this.access.requireAdministrator(identity, organizationId)
    const invitation = await this.prisma.memberInvitation.findFirst({
      include: { organization: true },
      where: {
        id: invitationId,
        organizationId,
        status: { in: ['PENDING', 'DELIVERY_FAILED', 'RESENDING'] },
      },
    })
    if (!invitation?.organization.keycloakOrganizationId) {
      throw new NotFoundException('Invitation not found')
    }
    if (invitation.status === 'PENDING' && Date.now() - invitation.updatedAt.getTime() < 60_000) {
      throw new HttpException('Try again later', 429)
    }
    const staleBefore = new Date(Date.now() - 120_000)
    if (invitation.status === 'RESENDING' && invitation.updatedAt > staleBefore) {
      throw new ConflictException('Invitation resend in progress')
    }
    const claimed = await this.prisma.memberInvitation.updateMany({
      data: { status: 'RESENDING' },
      where: {
        id: invitationId,
        OR: [
          { status: { in: ['PENDING', 'DELIVERY_FAILED'] } },
          { status: 'RESENDING', updatedAt: { lt: staleBefore } },
        ],
      },
    })
    if (claimed.count !== 1) throw new ConflictException('Invitation resend in progress')
    let keycloakInvitationId: string
    try {
      keycloakInvitationId = await this.keycloak.resendMemberInvitation(
        invitation.organization.keycloakOrganizationId,
        invitation.email,
      )
    } catch {
      await this.prisma.memberInvitation.updateMany({
        data: { status: 'DELIVERY_FAILED' },
        where: { id: invitationId, status: 'RESENDING' },
      })
      throw new ServiceUnavailableException('Invitation delivery unavailable')
    }
    const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS)
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.memberInvitation.updateMany({
        data: { expiresAt, keycloakInvitationId, status: 'PENDING' },
        where: { id: invitationId, status: 'RESENDING' },
      })
      if (updated.count !== 1) throw new ConflictException('Invitation no longer pending')
      await transaction.auditEvent.create({
        data: invitationAudit(
          identity.subject,
          organizationId,
          invitationId,
          'RESEND_MEMBER_INVITATION',
          'SUCCEEDED',
        ),
      })
    })
    return {
      id: invitationId,
      email: invitation.email,
      role: invitation.role,
      applicationKeys: invitation.applicationKeys,
      status: 'PENDING' as const,
      expiresAt,
    }
  }

  async revoke(identity: VerifiedSubject, organizationId: string, invitationId: string) {
    await this.access.requireAdministrator(identity, organizationId)
    const invitation = await this.prisma.memberInvitation.findFirst({
      include: { organization: true },
      where: {
        id: invitationId,
        organizationId,
        status: { in: ['PENDING', 'DELIVERY_FAILED', 'RESENDING', 'REVOCATION_PENDING'] },
      },
    })
    if (!invitation?.organization.keycloakOrganizationId) {
      throw new NotFoundException('Invitation not found')
    }
    const staleBefore = new Date(Date.now() - 120_000)
    if (invitation.status === 'RESENDING' && invitation.updatedAt > staleBefore) {
      throw new ConflictException('Invitation resend in progress')
    }
    // Block Core activation first; external deletion may be retried without granting access.
    if (invitation.status !== 'REVOCATION_PENDING') {
      await this.prisma.$transaction(async (transaction) => {
        const blocked = await transaction.memberInvitation.updateMany({
          data: { status: 'REVOCATION_PENDING' },
          where: {
            id: invitationId,
            OR: [
              { status: { in: ['PENDING', 'DELIVERY_FAILED'] } },
              { status: 'RESENDING', updatedAt: { lt: staleBefore } },
            ],
          },
        })
        if (blocked.count !== 1) throw new ConflictException('Invitation no longer pending')
        await transaction.auditEvent.create({
          data: invitationAudit(
            identity.subject,
            organizationId,
            invitationId,
            'REQUEST_REVOKE_MEMBER_INVITATION',
            'SUCCEEDED',
          ),
        })
      })
    }
    try {
      await this.keycloak.revokeMemberInvitation(
        invitation.organization.keycloakOrganizationId,
        invitation.email,
      )
    } catch {
      throw new ServiceUnavailableException('Invitation revocation pending')
    }
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.memberInvitation.updateMany({
        data: { status: 'REVOKED' },
        where: { id: invitationId, status: 'REVOCATION_PENDING' },
      })
      if (revoked.count !== 1) throw new ConflictException('Invitation no longer pending')
      await transaction.auditEvent.create({
        data: invitationAudit(
          identity.subject,
          organizationId,
          invitationId,
          'REVOKE_MEMBER_INVITATION',
          'SUCCEEDED',
        ),
      })
    })
    return { id: invitationId, status: 'REVOKED' as const }
  }
}
