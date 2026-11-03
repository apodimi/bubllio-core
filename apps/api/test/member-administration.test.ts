import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApplicationAccessService } from '../src/applications/application-access.service.js'
import type { VerifiedSubject } from '../src/auth/identity.types.js'
import { MemberAdministrationService } from '../src/members/member-administration.service.js'
import { MemberInvitationService } from '../src/members/member-invitation.service.js'
import { MemberInvitationLifecycleService } from '../src/members/member-invitation-lifecycle.service.js'
import { PrismaService } from '../src/prisma/prisma.service.js'
import { KeycloakInvitationClient } from '../src/members/keycloak-invitation.client.js'

const orgA = '00000000-0000-0000-0000-000000000001'
const orgB = '00000000-0000-0000-0000-000000000002'
const keycloakA = '00000000-0000-0000-0000-000000000011'
const keycloakB = '00000000-0000-0000-0000-000000000012'
const owner = '00000000-0000-0000-0000-000000000021'
const memberA = '00000000-0000-0000-0000-000000000022'
const memberB = '00000000-0000-0000-0000-000000000023'
const identity: VerifiedSubject = {
  audience: ['bubllio-core-api'],
  authenticatedAt: undefined,
  email: 'owner@example.test',
  emailVerified: true,
  issuer: 'https://identity.example.test/realms/bubllio',
  organization: { a: { id: keycloakA } },
  subject: owner,
}
const transaction = {
  memberInvitation: { updateMany: vi.fn() },
  organizationApplication: { findMany: vi.fn() },
  organizationRoleAssignment: { update: vi.fn() },
  memberApplicationGrant: { findMany: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
  auditEvent: { create: vi.fn() },
}
const prisma = {
  $transaction: vi.fn((run: (client: typeof transaction) => unknown) => run(transaction)),
  organization: { findUnique: vi.fn() },
  organizationApplication: { findMany: vi.fn() },
  organizationRoleAssignment: { findUnique: vi.fn(), findMany: vi.fn() },
  memberInvitation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  auditEvent: { create: vi.fn() },
}
const keycloak = {
  findSubjectByEmail: vi.fn(),
  inviteMember: vi.fn(),
  isMember: vi.fn(),
  resendMemberInvitation: vi.fn(),
  revokeMemberInvitation: vi.fn(),
}
const client = prisma as unknown as PrismaService
const access = new ApplicationAccessService(client)
const provider = keycloak as unknown as KeycloakInvitationClient
const members = new MemberAdministrationService(client, access, provider)
const invitations = new MemberInvitationService(client, access, provider)
const lifecycle = new MemberInvitationLifecycleService(client, access, provider)

describe('organization member administration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.organization.findUnique.mockImplementation(({ where }) => ({
      keycloakOrganizationId: where.id === orgA ? keycloakA : keycloakB,
      roleAssignments: [{ role: 'OWNER' }],
      status: 'ACTIVE',
    }))
    prisma.organizationRoleAssignment.findUnique.mockImplementation(({ where }) =>
      where.organizationId_subject.organizationId === orgA &&
      where.organizationId_subject.subject === memberA
        ? { subject: memberA, role: 'MEMBER' }
        : null,
    )
    prisma.organizationRoleAssignment.findMany.mockResolvedValue([
      { subject: owner, email: null, role: 'OWNER', applicationGrants: [] },
      {
        subject: memberA,
        email: 'a@example.test',
        role: 'MEMBER',
        applicationGrants: [{ applicationKey: 'bubllio-crm' }],
      },
    ])
    prisma.organizationApplication.findMany.mockResolvedValue([{ applicationKey: 'bubllio-crm' }])
    transaction.organizationApplication.findMany.mockResolvedValue([
      { applicationKey: 'bubllio-board' },
    ])
    transaction.memberApplicationGrant.findMany.mockResolvedValue([
      { applicationKey: 'bubllio-crm' },
    ])
    keycloak.findSubjectByEmail.mockResolvedValue(undefined)
    keycloak.inviteMember.mockResolvedValue('00000000-0000-0000-0000-000000000041')
    keycloak.isMember.mockResolvedValue(true)
    keycloak.resendMemberInvitation.mockResolvedValue('00000000-0000-0000-0000-000000000043')
    prisma.memberInvitation.findUnique.mockResolvedValue(null)
    prisma.memberInvitation.updateMany.mockResolvedValue({ count: 1 })
    transaction.memberInvitation.updateMany.mockResolvedValue({ count: 1 })
    prisma.memberInvitation.create.mockImplementation(({ data }) => ({
      ...data,
      id: '00000000-0000-0000-0000-000000000042',
    }))
    prisma.memberInvitation.findFirst.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000042',
      organizationId: orgA,
      email: 'invitee@example.test',
      role: 'MEMBER',
      applicationKeys: [],
      status: 'PENDING',
      updatedAt: new Date(Date.now() - 120_000),
      organization: { keycloakOrganizationId: keycloakA },
    })
  })

  it('shows only the authorized organization member directory', async () => {
    const listed = await members.list(identity, orgA)
    expect(listed).toHaveLength(2)
    expect(listed[1]).toMatchObject({ subject: memberA, applicationKeys: ['bubllio-crm'] })
    await expect(members.list(identity, orgB)).rejects.toThrow(NotFoundException)
    expect(prisma.organizationRoleAssignment.findMany).toHaveBeenCalledTimes(1)
  })

  it('hides a Core role assignment after Keycloak membership is removed', async () => {
    keycloak.isMember.mockImplementation(
      async (_organizationId: string, subject: string) => subject !== memberA,
    )
    const listed = await members.list(identity, orgA)
    expect(listed.map(({ subject }) => subject)).toEqual([owner])
  })

  it('keeps invite selections pending and rejects a second organization', async () => {
    const input = {
      email: 'invitee@example.test',
      role: 'MEMBER' as const,
      applicationKeys: ['bubllio-crm'],
    }
    await expect(invitations.invite(identity, orgA, input)).resolves.toMatchObject({
      email: input.email,
      status: 'PENDING',
      applicationKeys: input.applicationKeys,
    })
    expect(prisma.organizationRoleAssignment.findUnique).not.toHaveBeenCalled()
    expect(transaction.memberApplicationGrant.upsert).not.toHaveBeenCalled()
    await expect(invitations.invite(identity, orgB, input)).rejects.toThrow(NotFoundException)
    expect(prisma.memberInvitation.create).toHaveBeenCalledTimes(1)
  })

  it('updates one member grant set and rejects a different organization or member', async () => {
    const input = { role: 'ADMIN' as const, applicationKeys: ['bubllio-board'] }
    await expect(members.updateAccess(identity, orgA, memberA, input)).resolves.toEqual({
      subject: memberA,
      ...input,
    })
    expect(transaction.memberApplicationGrant.updateMany).toHaveBeenCalledWith({
      data: { active: false },
      where: { organizationId: orgA, subject: memberA, active: true },
    })
    expect(transaction.memberApplicationGrant.upsert).toHaveBeenCalledTimes(1)
    await expect(members.updateAccess(identity, orgB, memberB, input)).rejects.toThrow(
      NotFoundException,
    )
    await expect(members.updateAccess(identity, orgA, memberB, input)).rejects.toThrow(
      NotFoundException,
    )
    expect(transaction.memberApplicationGrant.upsert).toHaveBeenCalledTimes(1)
  })

  it('denies administration to a member even inside the right organization', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      keycloakOrganizationId: keycloakA,
      roleAssignments: [{ role: 'MEMBER' }],
      status: 'ACTIVE',
    })
    await expect(members.list({ ...identity, subject: memberA }, orgA)).rejects.toThrow(
      ForbiddenException,
    )
    await expect(
      invitations.invite({ ...identity, subject: memberA }, orgA, {
        email: 'new@example.test',
        role: 'MEMBER',
        applicationKeys: [],
      }),
    ).rejects.toThrow(ForbiddenException)
    expect(prisma.memberInvitation.create).not.toHaveBeenCalled()
  })

  it('does not revert an accepted invitation after provider delivery', async () => {
    transaction.memberInvitation.updateMany.mockResolvedValueOnce({ count: 0 })
    await expect(
      invitations.invite(identity, orgA, {
        email: 'invitee@example.test',
        role: 'MEMBER',
        applicationKeys: ['bubllio-crm'],
      }),
    ).rejects.toThrow(ConflictException)
    expect(transaction.auditEvent.create).not.toHaveBeenCalled()
  })

  it('does not call provider resend or revoke when another mutation wins the claim', async () => {
    prisma.memberInvitation.updateMany.mockResolvedValue({ count: 0 })
    transaction.memberInvitation.updateMany.mockResolvedValueOnce({ count: 0 })
    const id = '00000000-0000-0000-0000-000000000042'
    await expect(lifecycle.resend(identity, orgA, id)).rejects.toThrow(ConflictException)
    await expect(lifecycle.revoke(identity, orgA, id)).rejects.toThrow(ConflictException)
    expect(keycloak.resendMemberInvitation).not.toHaveBeenCalled()
    expect(keycloak.revokeMemberInvitation).not.toHaveBeenCalled()
  })

  it('allows an owner to edit owner app grants without changing ownership', async () => {
    prisma.organizationRoleAssignment.findUnique.mockResolvedValueOnce({
      subject: owner,
      role: 'OWNER',
    })
    await expect(
      members.updateAccess(identity, orgA, owner, {
        role: 'OWNER',
        applicationKeys: ['bubllio-board'],
      }),
    ).resolves.toMatchObject({ subject: owner, role: 'OWNER' })
    expect(transaction.organizationRoleAssignment.update).toHaveBeenCalledWith({
      data: { role: 'OWNER' },
      where: { organizationId_subject: { organizationId: orgA, subject: owner } },
    })
  })

  it('rejects newly unavailable app selections before changing a member', async () => {
    transaction.organizationApplication.findMany.mockResolvedValueOnce([])
    await expect(
      members.updateAccess(identity, orgA, memberA, {
        role: 'ADMIN',
        applicationKeys: ['bubllio-board'],
      }),
    ).rejects.toThrow(NotFoundException)
    expect(transaction.organizationRoleAssignment.update).not.toHaveBeenCalled()
    expect(transaction.memberApplicationGrant.upsert).not.toHaveBeenCalled()
  })
})
