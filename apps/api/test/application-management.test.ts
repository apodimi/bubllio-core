import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApplicationAccessService } from '../src/applications/application-access.service.js'
import { ApplicationManagementService } from '../src/applications/application-management.service.js'
import type { VerifiedSubject } from '../src/auth/identity.types.js'
import { PrismaService } from '../src/prisma/prisma.service.js'
import { runtimeConfig } from './runtime-config.fixture.js'

const organizationId = '00000000-0000-0000-0000-000000000001'
const identityOrganizationId = '00000000-0000-0000-0000-000000000011'
const actorSubject = '00000000-0000-0000-0000-000000000002'
const targetSubject = '00000000-0000-0000-0000-000000000003'

const transaction = {
  application: { create: vi.fn() },
  auditEvent: { create: vi.fn() },
  memberApplicationGrant: { upsert: vi.fn(), updateMany: vi.fn() },
  organizationApplication: { upsert: vi.fn(), updateMany: vi.fn() },
}
const prisma = {
  $transaction: vi.fn((run: (client: typeof transaction) => unknown) => run(transaction)),
  application: { findFirst: vi.fn() },
  installationSetup: { findUnique: vi.fn() },
  organization: { findUnique: vi.fn() },
  organizationApplication: { findUnique: vi.fn() },
  organizationRoleAssignment: { findUnique: vi.fn() },
}
const identity: VerifiedSubject = {
  audience: ['bubllio-core-api'],
  authenticatedAt: undefined,
  email: 'owner@example.test',
  emailVerified: true,
  issuer: 'https://identity.example.test/realms/bubllio',
  organization: { team: { id: identityOrganizationId } },
  subject: actorSubject,
}
const registration = {
  key: 'bubllio-crm',
  displayName: 'CRM',
  launchUrl: 'https://crm.example.test',
  audience: 'bubllio-crm-api',
}

describe('application administration', () => {
  const client = prisma as unknown as PrismaService
  const management = new ApplicationManagementService(
    client,
    new ApplicationAccessService(client),
    runtimeConfig({ localApplicationRegistrationEnabled: true }),
  )

  beforeEach(() => {
    vi.clearAllMocks()
    prisma.installationSetup.findUnique.mockResolvedValue({
      claimedBySubject: actorSubject,
      organizationId,
      status: 'READY',
    })
    prisma.organization.findUnique.mockResolvedValue({
      keycloakOrganizationId: identityOrganizationId,
      roleAssignments: [{ role: 'OWNER' }],
      status: 'ACTIVE',
    })
    prisma.application.findFirst.mockResolvedValue({ key: 'bubllio-crm' })
    prisma.organizationApplication.findUnique.mockResolvedValue({
      application: { available: true },
      enabled: true,
      entitled: true,
    })
    prisma.organizationRoleAssignment.findUnique.mockResolvedValue({ subject: targetSubject })
    transaction.application.create.mockResolvedValue(registration)
    transaction.organizationApplication.upsert.mockResolvedValue({})
    transaction.memberApplicationGrant.upsert.mockResolvedValue({})
    transaction.auditEvent.create.mockResolvedValue({})
  })

  it('allows only the installation owner to register an app', async () => {
    await expect(
      management.register({ ...identity, subject: targetSubject }, registration),
    ).rejects.toThrow(ForbiddenException)
    expect(transaction.application.create).not.toHaveBeenCalled()

    expect(await management.register(identity, registration)).toEqual(registration)
    expect(transaction.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'REGISTER_APPLICATION' }),
      }),
    )
  })

  it('keeps the legacy registration mutation disabled unless local rehearsal opts in', async () => {
    const disabled = new ApplicationManagementService(
      client,
      new ApplicationAccessService(client),
      runtimeConfig(),
    )

    await expect(disabled.register(identity, registration)).rejects.toThrow(NotFoundException)
    expect(prisma.installationSetup.findUnique).not.toHaveBeenCalled()
    expect(transaction.application.create).not.toHaveBeenCalled()
  })

  it('rejects unsafe app launch URLs before writing', async () => {
    await expect(
      management.register(identity, { ...registration, launchUrl: 'javascript:alert(1)' }),
    ).rejects.toThrow(BadRequestException)
    expect(transaction.application.create).not.toHaveBeenCalled()
  })

  it('does not let a Core member enable apps', async () => {
    prisma.organization.findUnique.mockResolvedValueOnce({
      keycloakOrganizationId: identityOrganizationId,
      roleAssignments: [{ role: 'MEMBER' }],
      status: 'ACTIVE',
    })
    await expect(management.enable(identity, organizationId, 'bubllio-crm')).rejects.toThrow(
      ForbiddenException,
    )
    expect(transaction.organizationApplication.upsert).not.toHaveBeenCalled()
  })

  it('does not grant app access to a subject without Core organization membership', async () => {
    prisma.organizationRoleAssignment.findUnique.mockResolvedValueOnce(null)
    await expect(
      management.grant(identity, organizationId, targetSubject, 'bubllio-crm'),
    ).rejects.toThrow(NotFoundException)
    expect(transaction.memberApplicationGrant.upsert).not.toHaveBeenCalled()
  })

  it('writes the grant and audit intent in one transaction', async () => {
    await management.grant(identity, organizationId, targetSubject, 'bubllio-crm')
    expect(transaction.memberApplicationGrant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_applicationKey_subject: {
            applicationKey: 'bubllio-crm',
            organizationId,
            subject: targetSubject,
          },
        },
      }),
    )
    expect(transaction.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'GRANT_APPLICATION_ACCESS' }),
      }),
    )
  })
})
