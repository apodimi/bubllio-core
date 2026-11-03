import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VerifiedSubject } from '../src/auth/identity.types.js'
import { MemberInvitationAcceptanceService } from '../src/members/member-invitation-acceptance.service.js'
import { PrismaService } from '../src/prisma/prisma.service.js'
import { KeycloakInvitationClient } from '../src/members/keycloak-invitation.client.js'

const organizationId = '00000000-0000-0000-0000-000000000001'
const keycloakId = '00000000-0000-0000-0000-000000000011'
const invitationId = '00000000-0000-0000-0000-000000000021'
const subject = '00000000-0000-0000-0000-000000000031'

const identity: VerifiedSubject = {
  audience: ['bubllio-core-api'],
  authenticatedAt: undefined,
  email: 'invitee@example.test',
  emailVerified: true,
  issuer: 'https://identity.example.test/realms/bubllio',
  organization: { selected: { id: keycloakId } },
  subject,
}
const invitation = {
  id: invitationId,
  organizationId,
  email: 'invitee@example.test',
  role: 'MEMBER',
  applicationKeys: ['bubllio-crm'],
  status: 'PENDING',
  expiresAt: new Date(Date.now() + 60_000),
  organization: { id: organizationId, status: 'ACTIVE', keycloakOrganizationId: keycloakId },
}
const transaction = {
  organizationApplication: {
    findMany: vi.fn().mockResolvedValue([{ applicationKey: 'bubllio-crm' }]),
  },
  memberInvitation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  organizationRoleAssignment: { create: vi.fn() },
  memberApplicationGrant: { create: vi.fn() },
  auditEvent: { create: vi.fn() },
}
const prisma = {
  $transaction: vi.fn((run: (client: typeof transaction) => unknown) => run(transaction)),
  memberInvitation: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  organization: { findUnique: vi.fn() },
  organizationApplication: {
    findMany: vi.fn().mockResolvedValue([{ applicationKey: 'bubllio-crm' }]),
  },
}
const keycloak = { inviteMember: vi.fn(), isMember: vi.fn() }
const service = new MemberInvitationAcceptanceService(
  prisma as unknown as PrismaService,
  keycloak as unknown as KeycloakInvitationClient,
)

describe('member invitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.memberInvitation.findUnique.mockResolvedValue(invitation)
    prisma.organization.findUnique.mockResolvedValue({ keycloakOrganizationId: keycloakId })
    keycloak.isMember.mockResolvedValue(true)
    transaction.memberInvitation.updateMany.mockResolvedValue({ count: 1 })
    transaction.organizationApplication.findMany.mockResolvedValue([
      { applicationKey: 'bubllio-crm' },
    ])
  })

  it('does not activate access for a different verified email', async () => {
    await expect(
      service.accept({ ...identity, email: 'other@example.test' }, invitationId),
    ).rejects.toThrow(NotFoundException)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('requires a fresh token for the exact identity organization', async () => {
    await expect(service.accept({ ...identity, organization: {} }, invitationId)).rejects.toThrow(
      'Refresh your organization session',
    )
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('requires Keycloak membership before assigning Core access', async () => {
    keycloak.isMember.mockResolvedValueOnce(false)
    await expect(service.accept(identity, invitationId)).rejects.toThrow(ForbiddenException)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('atomically marks the invitation and creates exact selected grants', async () => {
    await expect(service.accept(identity, invitationId)).resolves.toEqual({
      organizationId,
      status: 'ACCEPTED',
    })
    expect(transaction.organizationRoleAssignment.create).toHaveBeenCalledWith({
      data: { organizationId, subject, email: 'invitee@example.test', role: 'MEMBER' },
    })
    expect(transaction.memberApplicationGrant.create).toHaveBeenCalledTimes(1)
    expect(transaction.memberApplicationGrant.create).toHaveBeenCalledWith({
      data: { organizationId, subject, applicationKey: 'bubllio-crm' },
    })
  })

  it('rejects an unavailable app before creating a member', async () => {
    transaction.organizationApplication.findMany.mockResolvedValueOnce([])
    await expect(service.accept(identity, invitationId)).rejects.toThrow(NotFoundException)
    expect(transaction.organizationRoleAssignment.create).not.toHaveBeenCalled()
  })
})
