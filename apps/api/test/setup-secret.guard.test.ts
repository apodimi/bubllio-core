import { type ExecutionContext, NotFoundException } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SetupSecretGuard } from '../src/setup/guards/setup-secret.guard.js'
import { SetupSecretService } from '../src/setup/setup-secret.service.js'
import type { AuthenticatedRequest } from '../src/auth/identity.types.js'

const validSecret = 'correct horse battery staple'
const validSecretDigest = 'c4bbcb1fbec99d65bf59d85c8cb62ee2db963f0fe106f483d9afa73bd4e39a8a'

function createContext(secret?: string): ExecutionContext {
  const request: AuthenticatedRequest = {
    headers: {
      'x-bubllio-setup-secret': secret,
    },
  }

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext
}

describe('SetupSecretGuard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('allows the exact unexpired setup secret', () => {
    vi.stubEnv('CORE_SETUP_SECRET_SHA256', validSecretDigest)
    vi.stubEnv('CORE_SETUP_SECRET_EXPIRES_AT', '2027-01-01T00:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime('2026-12-31T23:45:00.000Z')
    const guard = new SetupSecretGuard(new SetupSecretService())

    expect(guard.canActivate(createContext(validSecret))).toBe(true)
  })

  it('returns the same unavailable response for a wrong secret', () => {
    vi.stubEnv('CORE_SETUP_SECRET_SHA256', validSecretDigest)
    vi.stubEnv('CORE_SETUP_SECRET_EXPIRES_AT', '2027-01-01T00:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime('2026-12-31T23:45:00.000Z')
    const guard = new SetupSecretGuard(new SetupSecretService())

    expect(() => guard.canActivate(createContext('wrong-secret'))).toThrow(NotFoundException)
  })

  it.each([
    ['missing presented secret', validSecretDigest, '2027-01-01T00:00:00.000Z', undefined],
    ['missing configured digest', undefined, '2027-01-01T00:00:00.000Z', validSecret],
    ['malformed configured digest', 'not-a-sha256-digest', '2027-01-01T00:00:00.000Z', validSecret],
    ['missing expiry', validSecretDigest, undefined, validSecret],
    ['malformed expiry', validSecretDigest, 'not-a-date', validSecret],
    ['expired secret', validSecretDigest, '2026-12-31T23:44:59.000Z', validSecret],
  ])('returns unavailable for %s', (_name, digest, expiry, presentedSecret) => {
    if (digest !== undefined) {
      vi.stubEnv('CORE_SETUP_SECRET_SHA256', digest)
    }
    if (expiry !== undefined) {
      vi.stubEnv('CORE_SETUP_SECRET_EXPIRES_AT', expiry)
    }
    vi.useFakeTimers()
    vi.setSystemTime('2026-12-31T23:45:00.000Z')
    const guard = new SetupSecretGuard(new SetupSecretService())

    expect(() => guard.canActivate(createContext(presentedSecret))).toThrow(NotFoundException)
  })
})
