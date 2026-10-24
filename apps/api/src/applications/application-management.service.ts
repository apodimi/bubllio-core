import { randomUUID } from 'node:crypto'

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import type { VerifiedSubject } from '../auth/identity.types.js'
import { InstallationSetupStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { ApplicationAccessService } from './application-access.service.js'

const APP_KEY_PATTERN = /^[a-z][a-z0-9-]{1,62}$/u
const AUDIENCE_PATTERN = /^[a-zA-Z0-9_.:-]{2,255}$/u

export interface RegisterApplicationInput {
  key: string
  displayName: string
  launchUrl: string
  audience: string
}

/** Mutations are authorized in Core and record a matching audit event atomically. */
@Injectable()
export class ApplicationManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ApplicationAccessService,
  ) {}

  async register(
    identity: VerifiedSubject,
    input: RegisterApplicationInput,
  ): Promise<RegisterApplicationInput> {
    const setup = await this.prisma.installationSetup.findUnique({
      select: { claimedBySubject: true, organizationId: true, status: true },
      where: { id: 1 },
    })
    if (
      setup?.status !== InstallationSetupStatus.READY ||
      setup.claimedBySubject !== identity.subject ||
      !setup.organizationId
    ) {
      throw new ForbiddenException('Installation ownership is required')
    }

    validateRegistration(input)
    const normalized = { ...input, displayName: input.displayName.trim() }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const app = await transaction.application.create({
          data: normalized,
          select: { key: true, displayName: true, launchUrl: true, audience: true },
        })
        await transaction.auditEvent.create({
          data: {
            action: 'REGISTER_APPLICATION',
            actorSubject: identity.subject,
            afterState: { applicationKey: app.key, audience: app.audience },
            correlationId: randomUUID(),
            organizationId: setup.organizationId!,
            outcome: 'SUCCEEDED',
            targetId: app.key,
            targetType: 'application',
          },
        })
        return app
      })
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ConflictException('Application key already exists')
      }
      throw error
    }
  }

  async enable(
    identity: VerifiedSubject,
    organizationId: string,
    applicationKey: string,
  ): Promise<void> {
    await this.access.requireAdministrator(identity, organizationId)
    await this.requireApplication(applicationKey)

    await this.prisma.$transaction(async (transaction) => {
      await transaction.organizationApplication.upsert({
        create: { applicationKey, organizationId },
        update: { enabled: true },
        where: { organizationId_applicationKey: { applicationKey, organizationId } },
      })
      await transaction.auditEvent.create({
        data: audit(identity.subject, organizationId, applicationKey, 'ENABLE_APPLICATION'),
      })
    })
  }

  async disable(
    identity: VerifiedSubject,
    organizationId: string,
    applicationKey: string,
  ): Promise<void> {
    await this.access.requireAdministrator(identity, organizationId)
    await this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.organizationApplication.updateMany({
        data: { enabled: false },
        where: { applicationKey, enabled: true, organizationId },
      })
      if (changed.count) {
        await transaction.auditEvent.create({
          data: audit(identity.subject, organizationId, applicationKey, 'DISABLE_APPLICATION'),
        })
      }
    })
  }

  async grant(
    identity: VerifiedSubject,
    organizationId: string,
    subject: string,
    applicationKey: string,
  ): Promise<void> {
    await this.access.requireAdministrator(identity, organizationId)
    const [member, organizationApp] = await Promise.all([
      this.prisma.organizationRoleAssignment.findUnique({
        where: { organizationId_subject: { organizationId, subject } },
      }),
      this.prisma.organizationApplication.findUnique({
        where: { organizationId_applicationKey: { applicationKey, organizationId } },
      }),
    ])
    if (!member || !organizationApp?.enabled || !organizationApp.entitled) {
      throw new NotFoundException('Member or application not available')
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.memberApplicationGrant.upsert({
        create: { applicationKey, organizationId, subject },
        update: { active: true },
        where: {
          organizationId_applicationKey_subject: { applicationKey, organizationId, subject },
        },
      })
      await transaction.auditEvent.create({
        data: {
          ...audit(identity.subject, organizationId, subject, 'GRANT_APPLICATION_ACCESS'),
          afterState: { active: true, applicationKey },
          targetType: 'member_application_grant',
        },
      })
    })
  }

  async revoke(
    identity: VerifiedSubject,
    organizationId: string,
    subject: string,
    applicationKey: string,
  ): Promise<void> {
    await this.access.requireAdministrator(identity, organizationId)
    await this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.memberApplicationGrant.updateMany({
        data: { active: false },
        where: { active: true, applicationKey, organizationId, subject },
      })
      if (changed.count) {
        await transaction.auditEvent.create({
          data: {
            ...audit(identity.subject, organizationId, subject, 'REVOKE_APPLICATION_ACCESS'),
            afterState: { active: false, applicationKey },
            targetType: 'member_application_grant',
          },
        })
      }
    })
  }

  private async requireApplication(applicationKey: string): Promise<void> {
    const app = await this.prisma.application.findUnique({
      select: { key: true },
      where: { key: applicationKey },
    })
    if (!app) {
      throw new NotFoundException('Application not found')
    }
  }
}

function audit(actorSubject: string, organizationId: string, targetId: string, action: string) {
  return {
    action,
    actorSubject,
    correlationId: randomUUID(),
    organizationId,
    outcome: 'SUCCEEDED',
    targetId,
    targetType: 'application',
  }
}

function validateRegistration(input: RegisterApplicationInput): void {
  if (
    !APP_KEY_PATTERN.test(input.key) ||
    typeof input.displayName !== 'string' ||
    input.displayName.trim().length < 2 ||
    input.displayName.trim().length > 80 ||
    !AUDIENCE_PATTERN.test(input.audience) ||
    typeof input.launchUrl !== 'string'
  ) {
    throw new BadRequestException('Invalid application registration')
  }

  let url: URL
  try {
    url = new URL(input.launchUrl)
  } catch {
    throw new BadRequestException('Invalid application registration')
  }
  const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
  if (
    (url.protocol !== 'https:' &&
      !(process.env.NODE_ENV !== 'production' && loopback && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    input.launchUrl.length > 2048
  ) {
    throw new BadRequestException('Invalid application registration')
  }
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 'P2002'
}
