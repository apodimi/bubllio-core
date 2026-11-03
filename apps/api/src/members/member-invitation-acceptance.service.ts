import { randomUUID } from 'node:crypto'

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import type { VerifiedSubject } from '../auth/identity.types.js'
import { hasOrganizationContext } from '../authorization/organization-context.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { KeycloakInvitationClient } from './keycloak-invitation.client.js'
import { requireAvailableApps } from './member-app-selection.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

@Injectable()
export class MemberInvitationAcceptanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloak: KeycloakInvitationClient,
  ) {}

  async accept(identity: VerifiedSubject, invitationId: string) {
    const email = verifiedEmail(identity)
    if (!UUID.test(invitationId) || !email) throw new NotFoundException('Invitation not found')
    const invitation = await this.prisma.memberInvitation.findUnique({
      include: { organization: true },
      where: { id: invitationId },
    })
    if (
      !invitation ||
      invitation.email !== email ||
      invitation.status !== 'PENDING' ||
      invitation.expiresAt <= new Date() ||
      invitation.organization.status !== 'ACTIVE' ||
      !invitation.organization.keycloakOrganizationId
    ) {
      throw new NotFoundException('Invitation not found')
    }
    const keycloakOrganizationId = invitation.organization.keycloakOrganizationId
    if (!hasOrganizationContext(identity, keycloakOrganizationId)) {
      throw new ConflictException('Refresh your organization session')
    }
    if (!(await this.keycloak.isMember(keycloakOrganizationId, identity.subject))) {
      throw new ForbiddenException('Organization membership is required')
    }

    await this.prisma.$transaction(async (transaction) => {
      await requireAvailableApps(transaction, invitation.organizationId, invitation.applicationKeys)
      const claimed = await transaction.memberInvitation.updateMany({
        data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedSubject: identity.subject },
        where: { id: invitation.id, status: 'PENDING', expiresAt: { gt: new Date() } },
      })
      if (claimed.count !== 1) throw new ConflictException('Invitation already used')
      await transaction.organizationRoleAssignment.create({
        data: {
          organizationId: invitation.organizationId,
          subject: identity.subject,
          email,
          role: invitation.role,
        },
      })
      for (const applicationKey of invitation.applicationKeys) {
        await transaction.memberApplicationGrant.create({
          data: {
            organizationId: invitation.organizationId,
            subject: identity.subject,
            applicationKey,
          },
        })
      }
      await transaction.auditEvent.create({
        data: {
          action: 'ACCEPT_MEMBER_INVITATION',
          actorSubject: identity.subject,
          correlationId: randomUUID(),
          organizationId: invitation.organizationId,
          outcome: 'SUCCEEDED',
          targetId: identity.subject,
          targetType: 'member',
          afterState: { role: invitation.role, applicationKeys: invitation.applicationKeys },
        },
      })
    })
    return { organizationId: invitation.organizationId, status: 'ACCEPTED' as const }
  }
}

export function verifiedEmail(identity: VerifiedSubject): string | undefined {
  return identity.emailVerified === true && identity.email
    ? identity.email.trim().toLowerCase()
    : undefined
}
