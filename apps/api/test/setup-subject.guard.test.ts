import { type ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SetupSubjectGuard } from '../src/setup/guards/setup-subject.guard.js'
import type { AuthenticatedRequest, VerifiedSubject } from '../src/auth/identity.types.js'

const nowSeconds = 1_798_800_000

function createSubject(overrides: Partial<VerifiedSubject> = {}): VerifiedSubject {
  return {
    audience: ['bubllio-core-api'],
    authenticatedAt: nowSeconds - 60,
    email: 'owner@example.test',
    emailVerified: true,
    issuer: 'https://identity.example.test/realms/bubllio',
    organization: {},
    subject: '00000000-0000-0000-0000-000000000002',
    ...overrides,
  }
}

function createContext(identity?: VerifiedSubject): ExecutionContext {
  const request: AuthenticatedRequest = {
    headers: {},
    identity,
  }

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext
}

describe('SetupSubjectGuard', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows a recently authenticated subject with a verified email', () => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
    const guard = new SetupSubjectGuard()

    expect(guard.canActivate(createContext(createSubject()))).toBe(true)
  })

  it('rejects an unverified email', () => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
    const guard = new SetupSubjectGuard()

    expect(() => guard.canActivate(createContext(createSubject({ emailVerified: false })))).toThrow(
      UnauthorizedException,
    )
  })

  it.each([
    ['missing email', { email: undefined }],
    ['blank email', { email: '   ' }],
    ['missing authentication time', { authenticatedAt: undefined }],
    ['authentication older than ten minutes', { authenticatedAt: nowSeconds - 601 }],
    ['authentication time in the future', { authenticatedAt: nowSeconds + 1 }],
  ] satisfies Array<[string, Partial<VerifiedSubject>]>)('rejects %s', (_name, overrides) => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
    const guard = new SetupSubjectGuard()

    expect(() => guard.canActivate(createContext(createSubject(overrides)))).toThrow(
      UnauthorizedException,
    )
  })

  it('rejects a request without an authenticated subject', () => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
    const guard = new SetupSubjectGuard()

    expect(() => guard.canActivate(createContext())).toThrow(UnauthorizedException)
  })
})
