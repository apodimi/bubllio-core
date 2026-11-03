import { randomUUID } from 'node:crypto'

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'

import { ApplicationAccessService } from '../applications/application-access.service.js'
import type { VerifiedSubject } from '../auth/identity.types.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { KeycloakInvitationClient } from './keycloak-invitation.client.js'
import type { AccessInput } from './member-input.js'
import { requireAvailableApps } from './member-app-selection.js'

@Injectable()
export class MemberAdministrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ApplicationAccessService,
    private readonly keycloak: KeycloakInvitationClient,
  ) {}

  async list(identity: VerifiedSubject, organizationId: string) {
    await this.access.requireAdministrator(identity, organizationId)
    const [organization, members] = await Promise.all([
      this.prisma.organization.findUnique({
        select: { keycloakOrganizationId: true },
        where: { id: organizationId },
      }),
      this.prisma.organizationRoleAssignment.findMany({
        orderBy: { createdAt: 'asc' },
        select: {
          subject: true,
          email: true,
          role: true,
          applicationGrants: { select: { applicationKey: true }, where: { active: true } },
        },
        where: { organizationId },
      }),
    ])
    if (!organization?.keycloakOrganizationId) throw new NotFoundException('Organization not found')
    const membership = await Promise.all(
      members.map((member) =>
        this.keycloak.isMember(organization.keycloakOrganizationId!, member.subject),
      ),
    )
    return members
      .filter((_, index) => membership[index])
      .map(({ applicationGrants, ...member }) => ({
        ...member,
        applicationKeys: applicationGrants.map(({ applicationKey }) => applicationKey),
      }))
  }

  async updateAccess(
    identity: VerifiedSubject,
    organizationId: string,
    subject: string,
    input: AccessInput,
  ) {
    const actorRole = await this.access.requireMember(identity, organizationId)
    if (actorRole === 'MEMBER') {
      throw new ForbiddenException('Organization administration is required')
    }
    const [organization, member] = await Promise.all([
      this.prisma.organization.findUnique({
        select: { keycloakOrganizationId: true },
        where: { id: organizationId },
      }),
      this.prisma.organizationRoleAssignment.findUnique({
        where: { organizationId_subject: { organizationId, subject } },
      }),
    ])
    if (!organization?.keycloakOrganizationId || !member) {
      throw new NotFoundException('Member not found')
    }
    if (member.role === 'OWNER' || input.role === 'OWNER') {
      if (actorRole !== 'OWNER' || member.role !== 'OWNER' || input.role !== 'OWNER') {
        throw new ForbiddenException('Owner role cannot be changed here')
      }
    }
    if (!(await this.keycloak.isMember(organization.keycloakOrganizationId, subject))) {
      throw new NotFoundException('Member not found')
    }

    await this.prisma.$transaction(async (transaction) => {
      await requireAvailableApps(transaction, organizationId, input.applicationKeys)
      await transaction.organizationRoleAssignment.update({
        data: { role: input.role },
        where: { organizationId_subject: { organizationId, subject } },
      })
      await transaction.memberApplicationGrant.updateMany({
        data: { active: false },
        where: { organizationId, subject, active: true },
      })
      for (const applicationKey of input.applicationKeys) {
        await transaction.memberApplicationGrant.upsert({
          create: { organizationId, subject, applicationKey },
          update: { active: true },
          where: {
            organizationId_applicationKey_subject: { organizationId, subject, applicationKey },
          },
        })
      }
      await transaction.auditEvent.create({
        data: {
          action: 'UPDATE_MEMBER_ACCESS',
          actorSubject: identity.subject,
          correlationId: randomUUID(),
          organizationId,
          outcome: 'SUCCEEDED',
          targetId: subject,
          targetType: 'member',
          beforeState: { role: member.role },
          afterState: { role: input.role, applicationKeys: input.applicationKeys },
        },
      })
    })
    return { subject, role: input.role, applicationKeys: input.applicationKeys }
  }
}
