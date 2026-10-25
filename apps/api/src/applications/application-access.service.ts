import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'

import type { VerifiedSubject } from '../auth/identity.types.js'
import { hasOrganizationContext } from '../authorization/organization-context.js'
import { OrganizationStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

export interface WorkspaceOrganization {
  id: string
  displayName: string
}

export interface WorkspaceApplication {
  key: string
  displayName: string
  launchUrl: string
}

/** Resolves Core organizations before evaluating app grants; route IDs alone prove nothing. */
@Injectable()
export class ApplicationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrganizations(identity: VerifiedSubject): Promise<WorkspaceOrganization[]> {
    const identityOrganizationIds = Object.values(identity.organization).map(({ id }) => id)
    if (identityOrganizationIds.length === 0) {
      return []
    }

    return this.prisma.organization.findMany({
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true },
      where: {
        keycloakOrganizationId: { in: identityOrganizationIds },
        roleAssignments: { some: { subject: identity.subject } },
        status: OrganizationStatus.ACTIVE,
      },
    })
  }

  async requireMember(
    identity: VerifiedSubject,
    organizationId: string,
  ): Promise<'OWNER' | 'ADMIN' | 'MEMBER'> {
    if (!UUID_PATTERN.test(organizationId)) {
      throw new NotFoundException('Organization not found')
    }

    const organization = await this.prisma.organization.findUnique({
      select: {
        keycloakOrganizationId: true,
        roleAssignments: {
          select: { role: true },
          take: 1,
          where: { subject: identity.subject },
        },
        status: true,
      },
      where: { id: organizationId },
    })

    if (
      !organization ||
      organization.status !== OrganizationStatus.ACTIVE ||
      !organization.keycloakOrganizationId ||
      !hasOrganizationContext(identity, organization.keycloakOrganizationId) ||
      organization.roleAssignments.length === 0
    ) {
      // An inaccessible organization must look the same as an unknown one.
      throw new NotFoundException('Organization not found')
    }

    return organization.roleAssignments[0]!.role
  }

  async requireAdministrator(identity: VerifiedSubject, organizationId: string): Promise<void> {
    const role = await this.requireMember(identity, organizationId)
    if (role === 'MEMBER') {
      throw new ForbiddenException('Organization administration is required')
    }
  }

  async listCatalog(
    identity: VerifiedSubject,
    organizationId: string,
  ): Promise<WorkspaceApplication[]> {
    await this.requireAdministrator(identity, organizationId)
    return this.prisma.application.findMany({
      orderBy: { displayName: 'asc' },
      select: { key: true, displayName: true, launchUrl: true },
      where: { available: true },
    })
  }

  async listApplications(
    identity: VerifiedSubject,
    organizationId: string,
  ): Promise<WorkspaceApplication[]> {
    await this.requireMember(identity, organizationId)

    const grants = await this.prisma.memberApplicationGrant.findMany({
      orderBy: { applicationKey: 'asc' },
      select: {
        organizationApp: {
          select: {
            application: {
              select: { key: true, displayName: true, launchUrl: true },
            },
          },
        },
      },
      where: {
        active: true,
        organizationApp: { application: { available: true }, enabled: true, entitled: true },
        organizationId,
        subject: identity.subject,
      },
    })

    return grants.map(({ organizationApp }) => organizationApp.application)
  }

  async canAccess(
    identity: VerifiedSubject,
    organizationId: string,
    applicationKey: string,
  ): Promise<boolean> {
    await this.requireMember(identity, organizationId)

    const grant = await this.prisma.memberApplicationGrant.findUnique({
      select: {
        active: true,
        organizationApp: {
          select: {
            application: { select: { available: true } },
            enabled: true,
            entitled: true,
          },
        },
      },
      where: {
        organizationId_applicationKey_subject: {
          applicationKey,
          organizationId,
          subject: identity.subject,
        },
      },
    })

    return Boolean(
      grant?.active &&
      grant.organizationApp.application.available &&
      grant.organizationApp.enabled &&
      grant.organizationApp.entitled,
    )
  }
}
