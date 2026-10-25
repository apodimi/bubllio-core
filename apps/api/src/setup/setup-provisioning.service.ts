import { createHash, randomUUID } from 'node:crypto'

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'

import type { VerifiedSubject } from '../auth/identity.types.js'
import {
  InstallationSetupStatus,
  OrganizationStatus,
  ProvisioningOperationStatus,
} from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import {
  KeycloakOrganizationClient,
  ProvisioningError,
  type ProvisioningErrorCode,
} from './keycloak-organization.client.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
const LEASE_MS = 30_000

class AttemptSuperseded extends Error {}

export interface SetupOperationView {
  id: string
  status: 'pending' | 'processing' | 'awaiting_owner' | 'succeeded' | 'needs_attention'
  stages: { name: string; status: string }[]
  safeErrorCode: ProvisioningErrorCode | null
  organizationId: string
  reauthenticationRequired: boolean
  correlationId: string
}

/** Persists an intent before touching Keycloak, then reconciles by immutable marker. */
@Injectable()
export class SetupProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloak: KeycloakOrganizationClient,
  ) {}

  async current(
    identity: VerifiedSubject,
  ): Promise<
    | { state: 'unclaimed' | 'claimed'; operation?: never }
    | { state: 'operation'; operation: SetupOperationView }
  > {
    const setup = await this.prisma.installationSetup.findUniqueOrThrow({ where: { id: 1 } })
    if (setup.claimedBySubject !== identity.subject) return { state: 'unclaimed' }
    if (setup.status === InstallationSetupStatus.CLAIMED) return { state: 'claimed' }
    if (!setup.organizationId) return { state: 'unclaimed' }
    const operation = await this.prisma.provisioningOperation.findFirst({
      select: { id: true },
      where: { organizationId: setup.organizationId, type: 'CREATE_ORGANIZATION' },
    })
    if (!operation) return { state: 'unclaimed' }
    return { state: 'operation', operation: await this.read(identity, operation.id) }
  }

  async start(
    identity: VerifiedSubject,
    displayName: string,
    idempotencyKey: string,
  ): Promise<SetupOperationView> {
    const name = displayName.trim()
    if (name.length < 2 || name.length > 120 || /[\x00-\x1f\x7f]/u.test(name)) {
      throw new UnprocessableEntityException('Invalid organization name')
    }
    const requestHash = createHash('sha256').update(name.normalize('NFC')).digest('hex')
    const setup = await this.prisma.installationSetup.findUniqueOrThrow({ where: { id: 1 } })
    if (setup.claimedBySubject !== identity.subject)
      throw new ForbiddenException('Setup claimant required')

    let operationId: string
    if (setup.status === InstallationSetupStatus.CLAIMED) {
      if (!setup.claimExpiresAt || setup.claimExpiresAt <= new Date()) {
        throw new ConflictException('Setup claim expired')
      }
      const organizationId = randomUUID()
      operationId = randomUUID()
      const slug = `org-${organizationId.slice(0, 8)}`
      await this.prisma.$transaction(async (transaction) => {
        await transaction.organization.create({
          data: { id: organizationId, slug, displayName: name },
        })
        const changed = await transaction.installationSetup.updateMany({
          data: {
            status: InstallationSetupStatus.PROVISIONING,
            organizationId,
            version: { increment: 1 },
          },
          where: {
            id: 1,
            status: InstallationSetupStatus.CLAIMED,
            claimedBySubject: identity.subject,
          },
        })
        if (changed.count !== 1) throw new ConflictException('Setup already started')
        await transaction.organizationRoleAssignment.create({
          data: { organizationId, subject: identity.subject, role: 'OWNER' },
        })
        await transaction.provisioningOperation.create({
          data: {
            id: operationId,
            organizationId,
            actorSubject: identity.subject,
            type: 'CREATE_ORGANIZATION',
            idempotencyKey,
            requestHash,
          },
        })
        await transaction.auditEvent.create({
          data: {
            action: 'START_FIRST_ORGANIZATION',
            actorSubject: identity.subject,
            correlationId: operationId,
            idempotencyKey,
            organizationId,
            outcome: 'PENDING',
            targetId: organizationId,
            targetType: 'organization',
          },
        })
      })
    } else {
      if (!setup.organizationId) throw new ConflictException('Setup state is inconsistent')
      const operation = await this.prisma.provisioningOperation.findFirst({
        where: { organizationId: setup.organizationId, type: 'CREATE_ORGANIZATION' },
      })
      if (
        !operation ||
        operation.idempotencyKey !== idempotencyKey ||
        operation.requestHash !== requestHash
      ) {
        throw new ConflictException('Setup intent conflicts with existing state')
      }
      operationId = operation.id
    }
    return this.process(identity, operationId)
  }

  async read(identity: VerifiedSubject, operationId: string): Promise<SetupOperationView> {
    if (!UUID.test(operationId)) throw new NotFoundException('Setup operation not found')
    const operation = await this.prisma.provisioningOperation.findUnique({
      include: { organization: true },
      where: { id: operationId },
    })
    if (
      !operation ||
      operation.type !== 'CREATE_ORGANIZATION' ||
      operation.actorSubject !== identity.subject
    ) {
      throw new NotFoundException('Setup operation not found')
    }
    const leaseExpired =
      operation.status === ProvisioningOperationStatus.PROCESSING &&
      operation.nextAttemptAt !== null &&
      operation.nextAttemptAt < new Date()
    const status =
      operation.status === ProvisioningOperationStatus.FAILED || leaseExpired
        ? 'needs_attention'
        : (operation.status.toLowerCase() as SetupOperationView['status'])
    return {
      id: operation.id,
      status,
      organizationId: operation.organizationId,
      correlationId: operation.id,
      safeErrorCode: leaseExpired
        ? 'SETUP_REPAIR_REQUIRED'
        : (operation.errorCode as ProvisioningErrorCode | null),
      reauthenticationRequired: status === 'succeeded',
      stages: [
        { name: 'core_organization', status: 'complete' },
        {
          name: 'identity_organization',
          status: operation.organization.keycloakOrganizationId
            ? 'complete'
            : status === 'needs_attention'
              ? 'needs_attention'
              : 'in_progress',
        },
        {
          name: 'owner_membership',
          status:
            status === 'succeeded'
              ? 'complete'
              : status === 'needs_attention'
                ? 'needs_attention'
                : status === 'awaiting_owner'
                  ? 'in_progress'
                  : 'queued',
        },
        { name: 'token_refresh', status: status === 'succeeded' ? 'in_progress' : 'queued' },
      ],
    }
  }

  async retry(identity: VerifiedSubject, operationId: string): Promise<SetupOperationView> {
    const operation = await this.read(identity, operationId)
    if (operation.status === 'succeeded') return operation
    return this.process(identity, operationId)
  }

  private async process(
    identity: VerifiedSubject,
    operationId: string,
  ): Promise<SetupOperationView> {
    const leaseExpiresAt = new Date(Date.now() + LEASE_MS)
    const claimed = await this.prisma.provisioningOperation.updateMany({
      data: {
        status: ProvisioningOperationStatus.PROCESSING,
        attemptCount: { increment: 1 },
        nextAttemptAt: leaseExpiresAt,
        errorCode: null,
      },
      where: {
        id: operationId,
        actorSubject: identity.subject,
        OR: [
          {
            status: {
              in: [
                ProvisioningOperationStatus.PENDING,
                ProvisioningOperationStatus.AWAITING_OWNER,
                ProvisioningOperationStatus.FAILED,
              ],
            },
          },
          { status: ProvisioningOperationStatus.PROCESSING, nextAttemptAt: { lt: new Date() } },
        ],
      },
    })
    if (claimed.count === 0) return this.read(identity, operationId)

    const operation = await this.prisma.provisioningOperation.findUniqueOrThrow({
      include: { organization: true },
      where: { id: operationId },
    })
    try {
      const identityOrganizationId = await this.keycloak.ensureOrganization(
        operation.organizationId,
        operation.organization.slug,
        operation.organization.displayName,
      )
      await this.prisma.organization.update({
        data: {
          keycloakOrganizationId: identityOrganizationId,
          status: OrganizationStatus.PROVISIONING,
        },
        where: { id: operation.organizationId },
      })
      await this.keycloak.ensureMember(identityOrganizationId, identity.subject)
      await this.prisma.$transaction(async (transaction) => {
        const completed = await transaction.provisioningOperation.updateMany({
          data: {
            status: ProvisioningOperationStatus.SUCCEEDED,
            nextAttemptAt: null,
            errorCode: null,
          },
          where: {
            id: operationId,
            status: ProvisioningOperationStatus.PROCESSING,
            attemptCount: operation.attemptCount,
          },
        })
        if (completed.count !== 1) throw new AttemptSuperseded()
        await transaction.organization.update({
          data: { status: OrganizationStatus.ACTIVE },
          where: { id: operation.organizationId },
        })
        await transaction.installationSetup.update({
          data: {
            status: InstallationSetupStatus.READY,
            completedAt: new Date(),
            version: { increment: 1 },
          },
          where: { id: 1 },
        })
        await transaction.auditEvent.create({
          data: {
            action: 'COMPLETE_FIRST_ORGANIZATION',
            actorSubject: identity.subject,
            correlationId: operationId,
            organizationId: operation.organizationId,
            outcome: 'SUCCEEDED',
            targetId: operation.organizationId,
            targetType: 'organization',
          },
        })
      })
    } catch (error) {
      if (error instanceof AttemptSuperseded) return this.read(identity, operationId)
      const code = error instanceof ProvisioningError ? error.code : 'SETUP_REPAIR_REQUIRED'
      const awaitingOwner = code === 'OWNER_INVITATION_PENDING'
      await this.prisma.$transaction(async (transaction) => {
        const failed = await transaction.provisioningOperation.updateMany({
          data: {
            status: awaitingOwner
              ? ProvisioningOperationStatus.AWAITING_OWNER
              : ProvisioningOperationStatus.FAILED,
            nextAttemptAt: null,
            errorCode: code,
          },
          where: {
            id: operationId,
            status: ProvisioningOperationStatus.PROCESSING,
            attemptCount: operation.attemptCount,
          },
        })
        if (failed.count !== 1) return
        await transaction.installationSetup.update({
          data: {
            status: awaitingOwner
              ? InstallationSetupStatus.PROVISIONING
              : InstallationSetupStatus.NEEDS_ATTENTION,
            version: { increment: 1 },
          },
          where: { id: 1 },
        })
        await transaction.organization.update({
          data: {
            status: awaitingOwner
              ? OrganizationStatus.PROVISIONING
              : OrganizationStatus.NEEDS_ATTENTION,
          },
          where: { id: operation.organizationId },
        })
      })
    }
    return this.read(identity, operationId)
  }
}
