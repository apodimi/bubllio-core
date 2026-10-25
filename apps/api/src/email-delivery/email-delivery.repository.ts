import { Injectable } from '@nestjs/common'

import { EmailDeliverySetupStatus, InstallationSetupStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { EmailDeliverySafeErrorCode, EmailDeliveryStatusView } from './email-delivery.types.js'

export type ReserveTestResult =
  | { outcome: 'reserved' | 'replayed' | 'conflict' | 'closed' }
  | { outcome: 'failed'; safeErrorCode: EmailDeliverySafeErrorCode }

@Injectable()
export class EmailDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async status(): Promise<EmailDeliveryStatusView> {
    const row = await this.prisma.emailDeliverySetup.findUniqueOrThrow({ where: { id: 1 } })
    return {
      status: publicStatus(row.status),
      ...(isSafeErrorCode(row.safeErrorCode) ? { safeErrorCode: row.safeErrorCode } : {}),
      ...(row.status === EmailDeliverySetupStatus.ATTENTION
        ? { confirmationRetryable: row.confirmationRetryable }
        : {}),
    }
  }

  async isReady(): Promise<boolean> {
    const row = await this.prisma.emailDeliverySetup.findUniqueOrThrow({
      select: { status: true },
      where: { id: 1 },
    })
    return row.status === EmailDeliverySetupStatus.READY
  }

  async reserveTest(input: {
    codeExpiresAt: Date
    codeHmac: string
    fingerprint: string
    idempotencyKey: string
  }): Promise<ReserveTestResult> {
    return this.prisma.$transaction(async (transaction) => {
      const [installation, row] = await Promise.all([
        transaction.installationSetup.findUniqueOrThrow({
          select: { status: true },
          where: { id: 1 },
        }),
        transaction.emailDeliverySetup.findUniqueOrThrow({ where: { id: 1 } }),
      ])
      if (installation.status !== InstallationSetupStatus.NOT_STARTED) return { outcome: 'closed' }
      if (row.status === EmailDeliverySetupStatus.READY) return { outcome: 'closed' }
      if (row.testIdempotencyKey === input.idempotencyKey) {
        if (row.configurationFingerprint !== input.fingerprint) return { outcome: 'conflict' }
        if (row.status === EmailDeliverySetupStatus.AWAITING_CONFIRMATION)
          return { outcome: 'replayed' }
        if (row.status === EmailDeliverySetupStatus.ATTENTION && row.safeErrorCode) {
          return {
            outcome: 'failed',
            safeErrorCode: row.safeErrorCode as EmailDeliverySafeErrorCode,
          }
        }
        return { outcome: 'conflict' }
      }

      const reserved = await transaction.emailDeliverySetup.updateMany({
        data: {
          codeAttemptCount: 0,
          codeExpiresAt: input.codeExpiresAt,
          codeHmac: input.codeHmac,
          configurationFingerprint: input.fingerprint,
          confirmIdempotencyKey: null,
          confirmationRetryable: false,
          safeErrorCode: null,
          status: EmailDeliverySetupStatus.TEST_PENDING,
          testIdempotencyKey: input.idempotencyKey,
          testedAt: null,
          version: { increment: 1 },
        },
        where: { id: 1, version: row.version },
      })
      return reserved.count === 1 ? { outcome: 'reserved' } : { outcome: 'conflict' }
    })
  }

  async markTestSent(idempotencyKey: string, now: Date): Promise<void> {
    await this.prisma.emailDeliverySetup.updateMany({
      data: {
        safeErrorCode: null,
        confirmationRetryable: false,
        status: EmailDeliverySetupStatus.AWAITING_CONFIRMATION,
        testedAt: now,
      },
      where: {
        id: 1,
        status: EmailDeliverySetupStatus.TEST_PENDING,
        testIdempotencyKey: idempotencyKey,
      },
    })
  }

  async markAttention(
    idempotencyKey: string,
    safeErrorCode: EmailDeliverySafeErrorCode,
  ): Promise<void> {
    await this.prisma.emailDeliverySetup.updateMany({
      data: {
        confirmationRetryable: false,
        safeErrorCode,
        status: EmailDeliverySetupStatus.ATTENTION,
      },
      where: { id: 1, testIdempotencyKey: idempotencyKey },
    })
  }

  async markAttentionForConfirmation(safeErrorCode: EmailDeliverySafeErrorCode): Promise<void> {
    await this.prisma.emailDeliverySetup.update({
      data: {
        confirmationRetryable: true,
        safeErrorCode,
        status: EmailDeliverySetupStatus.ATTENTION,
      },
      where: { id: 1 },
    })
  }

  async challenge(): Promise<{
    codeAttemptCount: number
    codeExpiresAt?: Date
    codeHmac?: string
    confirmationRetryable: boolean
    configurationFingerprint?: string
    status: EmailDeliverySetupStatus
  }> {
    const row = await this.prisma.emailDeliverySetup.findUniqueOrThrow({
      select: {
        codeAttemptCount: true,
        codeExpiresAt: true,
        codeHmac: true,
        confirmationRetryable: true,
        configurationFingerprint: true,
        status: true,
      },
      where: { id: 1 },
    })
    return {
      codeAttemptCount: row.codeAttemptCount,
      confirmationRetryable: row.confirmationRetryable,
      ...(row.codeExpiresAt ? { codeExpiresAt: row.codeExpiresAt } : {}),
      ...(row.codeHmac ? { codeHmac: row.codeHmac } : {}),
      ...(row.configurationFingerprint
        ? { configurationFingerprint: row.configurationFingerprint }
        : {}),
      status: row.status,
    }
  }

  async recordInvalidConfirmation(code: EmailDeliverySafeErrorCode): Promise<number> {
    const updated = await this.prisma.emailDeliverySetup.updateMany({
      data: {
        codeAttemptCount: { increment: 1 },
        safeErrorCode: code,
      },
      where: { codeAttemptCount: { lt: 5 }, id: 1 },
    })
    if (updated.count !== 1) return 5
    const row = await this.prisma.emailDeliverySetup.findUniqueOrThrow({
      select: { codeAttemptCount: true },
      where: { id: 1 },
    })
    return row.codeAttemptCount
  }

  async markReady(idempotencyKey: string, now: Date): Promise<void> {
    await this.prisma.emailDeliverySetup.update({
      data: {
        codeExpiresAt: null,
        codeHmac: null,
        confirmIdempotencyKey: idempotencyKey,
        confirmedAt: now,
        confirmationRetryable: false,
        safeErrorCode: null,
        status: EmailDeliverySetupStatus.READY,
      },
      where: { id: 1 },
    })
  }
}

function isSafeErrorCode(value: unknown): value is EmailDeliverySafeErrorCode {
  return [
    'EMAIL_DELIVERY_UNAVAILABLE',
    'EMAIL_DELIVERY_AUTHENTICATION_FAILED',
    'EMAIL_DELIVERY_TLS_FAILED',
    'EMAIL_DELIVERY_REJECTED',
    'EMAIL_CONFIRMATION_EXPIRED',
    'EMAIL_CONFIRMATION_INVALID',
    'IDENTITY_ACTIVATION_FAILED',
  ].includes(String(value))
}

function publicStatus(status: EmailDeliverySetupStatus): EmailDeliveryStatusView['status'] {
  if (status === EmailDeliverySetupStatus.READY) return 'ready'
  if (
    status === EmailDeliverySetupStatus.TEST_PENDING ||
    status === EmailDeliverySetupStatus.AWAITING_CONFIRMATION
  ) {
    return 'awaiting_confirmation'
  }
  return status === EmailDeliverySetupStatus.ATTENTION ? 'attention' : 'required'
}
