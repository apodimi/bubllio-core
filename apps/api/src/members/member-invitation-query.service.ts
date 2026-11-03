import { Injectable } from '@nestjs/common'

import { ApplicationAccessService } from '../applications/application-access.service.js'
import type { VerifiedSubject } from '../auth/identity.types.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { verifiedEmail } from './member-invitation-acceptance.service.js'

@Injectable()
export class MemberInvitationQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ApplicationAccessService,
  ) {}

  async list(identity: VerifiedSubject, organizationId: string) {
    await this.access.requireAdministrator(identity, organizationId)
    const invitations = await this.prisma.memberInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        applicationKeys: true,
        status: true,
        expiresAt: true,
        updatedAt: true,
      },
      where: {
        organizationId,
        status: { in: ['PENDING', 'DELIVERY_FAILED', 'RESENDING', 'REVOCATION_PENDING'] },
      },
    })
    return invitations.map(({ updatedAt, ...invitation }) => ({
      ...invitation,
      status:
        invitation.status === 'PENDING' && invitation.expiresAt <= new Date()
          ? 'EXPIRED'
          : invitation.status === 'RESENDING' && updatedAt <= new Date(Date.now() - 120_000)
            ? 'DELIVERY_FAILED'
            : invitation.status,
    }))
  }

  async mine(identity: VerifiedSubject) {
    const email = verifiedEmail(identity)
    if (!email) return []
    const invitations = await this.prisma.memberInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        organizationId: true,
        role: true,
        applicationKeys: true,
        expiresAt: true,
        organization: { select: { displayName: true } },
      },
      where: {
        email,
        expiresAt: { gt: new Date() },
        status: 'PENDING',
        organization: { status: 'ACTIVE' },
      },
    })
    return invitations.map(({ organization, ...invitation }) => ({
      ...invitation,
      organizationName: organization.displayName,
    }))
  }
}
