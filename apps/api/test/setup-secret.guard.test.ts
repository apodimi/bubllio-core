import { type ExecutionContext, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { SetupSecretGuard } from '../src/setup/guards/setup-secret.guard.js'
import { SetupSecretService } from '../src/setup/setup-secret.service.js'
import type { AuthenticatedRequest } from '../src/auth/identity.types.js'
import { runtimeConfig } from './runtime-config.fixture.js'

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
  it('allows the exact unexpired setup secret', () => {
    const guard = new SetupSecretGuard(
      new SetupSecretService(
        runtimeConfig({
          setup: {
            claimEnabled: true,
            localRehearsal: true,
            secretExpiresAt: new Date('2027-01-01T00:00:00.000Z'),
            secretSha256: validSecretDigest,
          },
        }),
      ),
    )

    expect(guard.canActivate(createContext(validSecret))).toBe(true)
  })

  it('returns the same unavailable response for a wrong secret', () => {
    const guard = new SetupSecretGuard(
      new SetupSecretService(
        runtimeConfig({
          setup: {
            claimEnabled: true,
            localRehearsal: true,
            secretExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
            secretSha256: validSecretDigest,
          },
        }),
      ),
    )

    expect(() => guard.canActivate(createContext('wrong-secret'))).toThrow(NotFoundException)
  })

  it.each([
    [
      'missing presented secret',
      validSecretDigest,
      new Date('2099-01-01T00:00:00.000Z'),
      undefined,
    ],
    ['missing configured digest', undefined, new Date('2099-01-01T00:00:00.000Z'), validSecret],
    ['missing expiry', validSecretDigest, undefined, validSecret],
    ['expired secret', validSecretDigest, new Date('2020-01-01T00:00:00.000Z'), validSecret],
  ])('returns unavailable for %s', (_name, digest, expiry, presentedSecret) => {
    const guard = new SetupSecretGuard(
      new SetupSecretService(
        runtimeConfig({
          setup: {
            claimEnabled: true,
            localRehearsal: true,
            secretExpiresAt: expiry,
            secretSha256: digest,
          },
        }),
      ),
    )

    expect(() => guard.canActivate(createContext(presentedSecret))).toThrow(NotFoundException)
  })
})
