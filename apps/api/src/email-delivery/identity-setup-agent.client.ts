import { Inject, Injectable } from '@nestjs/common'

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'
import type { EmailDeliverySafeErrorCode, EmailTestAgentInput } from './email-delivery.types.js'

const TEST_TIMEOUT_MS = 45_000
const FINALIZE_TIMEOUT_MS = 60_000

export class IdentitySetupAgentError extends Error {
  constructor(readonly safeCode: EmailDeliverySafeErrorCode) {
    super(safeCode)
  }
}

@Injectable()
export class IdentitySetupAgentClient {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  testEmail(input: EmailTestAgentInput): Promise<void> {
    return this.request('/internal/v1/email/test', input, TEST_TIMEOUT_MS)
  }

  finalizeEmail(fingerprint: string): Promise<void> {
    return this.request('/internal/v1/email/finalize', { fingerprint }, FINALIZE_TIMEOUT_MS)
  }

  private async request(path: string, body: unknown, timeoutMs: number): Promise<void> {
    const { url, token } = this.config.identitySetupAgent
    if (!url || !token) throw new IdentitySetupAgentError('EMAIL_DELIVERY_UNAVAILABLE')
    let response: Response
    try {
      response = await fetch(new URL(path, url), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch {
      throw new IdentitySetupAgentError('EMAIL_DELIVERY_UNAVAILABLE')
    }
    if (response.ok) return
    const payload: unknown = await response.json().catch(() => undefined)
    const code =
      typeof payload === 'object' && payload !== null ? Reflect.get(payload, 'code') : undefined
    throw new IdentitySetupAgentError(isSafeCode(code) ? code : 'EMAIL_DELIVERY_UNAVAILABLE')
  }
}

function isSafeCode(value: unknown): value is EmailDeliverySafeErrorCode {
  return [
    'EMAIL_DELIVERY_UNAVAILABLE',
    'EMAIL_DELIVERY_AUTHENTICATION_FAILED',
    'EMAIL_DELIVERY_TLS_FAILED',
    'EMAIL_DELIVERY_REJECTED',
    'IDENTITY_ACTIVATION_FAILED',
  ].includes(String(value))
}
