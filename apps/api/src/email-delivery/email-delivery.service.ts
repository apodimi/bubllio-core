import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

import { ConflictException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common'

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'
import { EmailDeliverySetupStatus } from '../generated/prisma/enums.js'
import { EmailDeliveryRepository } from './email-delivery.repository.js'
import { parseEmailConfirmInput, parseEmailTestInput } from './email-delivery.schema.js'
import type { EmailTestInput } from './email-delivery.types.js'
import { IdentitySetupAgentClient, IdentitySetupAgentError } from './identity-setup-agent.client.js'

const CODE_LIFETIME_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

@Injectable()
export class EmailDeliveryService {
  constructor(
    private readonly repository: EmailDeliveryRepository,
    private readonly agent: IdentitySetupAgentClient,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  async test(
    raw: unknown,
    idempotencyKey: string,
  ): Promise<{ maskedRecipient: string; status: 'awaiting_confirmation' }> {
    let input: EmailTestInput
    try {
      input = parseEmailTestInput(raw, this.config.environment)
    } catch {
      throw new UnprocessableEntityException('Invalid email setup request')
    }
    const fingerprint = this.fingerprint(input)
    const confirmationCode = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const codeHmac = this.codeHmac(fingerprint, confirmationCode)
    const reservation = await this.repository.reserveTest({
      codeExpiresAt: new Date(Date.now() + CODE_LIFETIME_MS),
      codeHmac,
      fingerprint,
      idempotencyKey,
    })
    if (reservation.outcome === 'conflict')
      throw new ConflictException('Email setup request conflicts')
    if (reservation.outcome === 'closed')
      throw new ConflictException('Email setup is already closed')
    if (reservation.outcome === 'failed') throw new ConflictException(reservation.safeErrorCode)
    if (reservation.outcome !== 'replayed') {
      try {
        await this.agent.testEmail({ ...input, confirmationCode, fingerprint })
        await this.repository.markTestSent(idempotencyKey, new Date())
      } catch (error) {
        const safeCode =
          error instanceof IdentitySetupAgentError ? error.safeCode : 'EMAIL_DELIVERY_UNAVAILABLE'
        await this.repository.markAttention(idempotencyKey, safeCode)
        throw new ConflictException(safeCode)
      }
    }
    return { maskedRecipient: maskEmail(input.testRecipient), status: 'awaiting_confirmation' }
  }

  async confirm(raw: unknown, idempotencyKey: string): Promise<{ status: 'ready' }> {
    let code: string
    try {
      code = parseEmailConfirmInput(raw).code
    } catch {
      throw new UnprocessableEntityException('Invalid email setup request')
    }
    const challenge = await this.repository.challenge()
    if (challenge.status === EmailDeliverySetupStatus.READY) return { status: 'ready' }
    if (
      (challenge.status !== EmailDeliverySetupStatus.AWAITING_CONFIRMATION &&
        challenge.status !== EmailDeliverySetupStatus.TEST_PENDING &&
        challenge.status !== EmailDeliverySetupStatus.ATTENTION) ||
      (challenge.status === EmailDeliverySetupStatus.ATTENTION &&
        !challenge.confirmationRetryable) ||
      !challenge.codeExpiresAt ||
      !challenge.codeHmac ||
      !challenge.configurationFingerprint
    ) {
      throw new ConflictException('Email confirmation is unavailable')
    }
    if (challenge.codeAttemptCount >= MAX_ATTEMPTS) {
      throw new ConflictException('EMAIL_CONFIRMATION_INVALID')
    }
    if (new Date() >= challenge.codeExpiresAt) {
      await this.repository.recordInvalidConfirmation('EMAIL_CONFIRMATION_EXPIRED')
      throw new ConflictException('EMAIL_CONFIRMATION_EXPIRED')
    }
    const presented = Buffer.from(this.codeHmac(challenge.configurationFingerprint, code), 'hex')
    const expected = Buffer.from(challenge.codeHmac, 'hex')
    if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
      await this.repository.recordInvalidConfirmation('EMAIL_CONFIRMATION_INVALID')
      throw new ConflictException('EMAIL_CONFIRMATION_INVALID')
    }
    try {
      await this.agent.finalizeEmail(challenge.configurationFingerprint)
    } catch (error) {
      const safeCode =
        error instanceof IdentitySetupAgentError ? error.safeCode : 'IDENTITY_ACTIVATION_FAILED'
      await this.repository.markAttentionForConfirmation(safeCode)
      throw new ConflictException(safeCode)
    }
    await this.repository.markReady(idempotencyKey, new Date())
    return { status: 'ready' }
  }

  private fingerprint(input: EmailTestInput): string {
    const key = this.setupKey()
    return createHmac('sha256', key).update(JSON.stringify(input), 'utf8').digest('hex')
  }

  private codeHmac(fingerprint: string, code: string): string {
    return createHmac('sha256', this.setupKey())
      .update(`${fingerprint}:${code}`, 'utf8')
      .digest('hex')
  }

  private setupKey(): Buffer {
    const digest = this.config.setup.secretSha256
    if (!digest) throw new ConflictException('Email setup is unavailable')
    return Buffer.from(digest, 'hex')
  }
}

function maskEmail(email: string): string {
  const separator = email.lastIndexOf('@')
  const local = email.slice(0, separator)
  const domain = email.slice(separator + 1)
  return `${local.slice(0, 1)}${'*'.repeat(Math.min(Math.max(local.length - 1, 2), 8))}@${domain}`
}
