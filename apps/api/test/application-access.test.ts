import { NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApplicationAccessService } from '../src/applications/application-access.service.js'
import type { VerifiedSubject } from '../src/auth/identity.types.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const coreOrganizationId = '00000000-0000-0000-0000-000000000001'
const identityOrganizationId = '00000000-0000-0000-0000-000000000011'
const subject = '00000000-0000-0000-0000-000000000002'

const prisma = {
  memberApplicationGrant: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  organization: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}

function identity(organizationId = identityOrganizationId): VerifiedSubject {
  return {
    audience: ['bubllio-core-api'],
    authenticatedAt: undefined,
    email: 'member@example.test',
    emailVerified: true,
    issuer: 'https://identity.example.test/realms/bubllio',
    organization: { team: { id: organizationId } },
    subject,
  }
}

describe('Core application access', () => {
  const access = new ApplicationAccessService(prisma as unknown as PrismaService)

  beforeEach(() => {
    vi.clearAllMocks()
    prisma.organization.findUnique.mockResolvedValue({
      keycloakOrganizationId: identityOrganizationId,
      roleAssignments: [{ role: 'MEMBER' }],
      status: 'ACTIVE',
    })
    prisma.memberApplicationGrant.findUnique.mockResolvedValue({
      active: true,
      organizationApp: { enabled: true, entitled: true },
    })
  })

  it('maps the route Core ID to the exact Keycloak organization ID', async () => {
    expect(await access.canAccess(identity(), coreOrganizationId, 'bubllio-crm')).toBe(true)
    expect(prisma.organization.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: coreOrganizationId } }),
    )
    expect(prisma.memberApplicationGrant.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_applicationKey_subject: {
            applicationKey: 'bubllio-crm',
            organizationId: coreOrganizationId,
            subject,
          },
        },
      }),
    )
  })

  it('rejects a token carrying the Core ID instead of the linked identity ID', async () => {
    await expect(
      access.canAccess(identity(coreOrganizationId), coreOrganizationId, 'bubllio-crm'),
    ).rejects.toThrow(NotFoundException)
    expect(prisma.memberApplicationGrant.findUnique).not.toHaveBeenCalled()
  })

  it.each([
    ['suspended organization', { status: 'SUSPENDED' }],
    ['missing identity link', { keycloakOrganizationId: null }],
    ['missing Core membership', { roleAssignments: [] }],
  ])('rejects %s before reading grants', async (_name, override) => {
    prisma.organization.findUnique.mockResolvedValueOnce({
      keycloakOrganizationId: identityOrganizationId,
      roleAssignments: [{ role: 'MEMBER' }],
      status: 'ACTIVE',
      ...override,
    })
    await expect(access.canAccess(identity(), coreOrganizationId, 'bubllio-crm')).rejects.toThrow(
      NotFoundException,
    )
    expect(prisma.memberApplicationGrant.findUnique).not.toHaveBeenCalled()
  })

  it.each([
    ['missing grant', null],
    ['revoked grant', { active: false, organizationApp: { enabled: true, entitled: true } }],
    ['disabled app', { active: true, organizationApp: { enabled: false, entitled: true } }],
    ['missing entitlement', { active: true, organizationApp: { enabled: true, entitled: false } }],
  ])('denies %s', async (_name, grant) => {
    prisma.memberApplicationGrant.findUnique.mockResolvedValueOnce(grant)
    expect(await access.canAccess(identity(), coreOrganizationId, 'bubllio-crm')).toBe(false)
  })

  it('shows only active granted apps in the workspace query', async () => {
    prisma.memberApplicationGrant.findMany.mockResolvedValueOnce([
      {
        organizationApp: {
          application: {
            key: 'bubllio-crm',
            displayName: 'CRM',
            launchUrl: 'https://crm.example.test',
          },
        },
      },
    ])
    const apps = await access.listApplications(identity(), coreOrganizationId)
    expect(apps).toEqual([
      { key: 'bubllio-crm', displayName: 'CRM', launchUrl: 'https://crm.example.test' },
    ])
    expect(prisma.memberApplicationGrant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          active: true,
          organizationApp: { enabled: true, entitled: true },
          organizationId: coreOrganizationId,
          subject,
        },
      }),
    )
  })

  it('does not query product organizations for a subject without identity membership', async () => {
    expect(await access.listOrganizations({ ...identity(), organization: {} })).toEqual([])
    expect(prisma.organization.findMany).not.toHaveBeenCalled()
  })

  it("keeps each member's app grants separate within one organization", async () => {
    const developer = { ...identity(), subject: 'developer-subject' }
    const salesperson = { ...identity(), subject: 'salesperson-subject' }
    prisma.memberApplicationGrant.findMany.mockImplementation(async ({ where }) =>
      where.subject === 'developer-subject'
        ? [
            {
              organizationApp: {
                application: {
                  key: 'bubllio-board',
                  displayName: 'Board',
                  launchUrl: 'https://board.example.test',
                },
              },
            },
          ]
        : [
            {
              organizationApp: {
                application: {
                  key: 'bubllio-crm',
                  displayName: 'CRM',
                  launchUrl: 'https://crm.example.test',
                },
              },
            },
          ],
    )

    expect(
      (await access.listApplications(developer, coreOrganizationId)).map((app) => app.key),
    ).toEqual(['bubllio-board'])
    expect(
      (await access.listApplications(salesperson, coreOrganizationId)).map((app) => app.key),
    ).toEqual(['bubllio-crm'])
  })

  it('denies a valid member of another identity organization', async () => {
    const otherOrganization = identity('00000000-0000-0000-0000-000000000099')
    await expect(
      access.canAccess(otherOrganization, coreOrganizationId, 'bubllio-crm'),
    ).rejects.toThrow(NotFoundException)
    expect(prisma.memberApplicationGrant.findUnique).not.toHaveBeenCalled()
  })
})
