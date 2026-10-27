import { type ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SetupSubjectGuard } from '../src/setup/guards/setup-subject.guard.js'
import type { AuthenticatedRequest, VerifiedSubject } from '../src/auth/identity.types.js'
import type { KeycloakOrganizationClient } from '../src/setup/keycloak-organization.client.js'

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
  const identityDirectory = {
    hasVerifiedEmail: vi.fn(),
  } as unknown as KeycloakOrganizationClient

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('allows a recently authenticated subject with a verified email', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
    const guard = new SetupSubjectGuard(identityDirectory)

    await expect(guard.canActivate(createContext(createSubject()))).resolves.toBe(true)
    expect(identityDirectory.hasVerifiedEmail).not.toHaveBeenCalled()
  })

  it('accepts directory-verified email when legacy tokens omit email claims', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
    vi.mocked(identityDirectory.hasVerifiedEmail).mockResolvedValueOnce(true)
    const guard = new SetupSubjectGuard(identityDirectory)

    await expect(
      guard.canActivate(
        createContext(createSubject({ email: undefined, emailVerified: undefined })),
      ),
    ).resolves.toBe(true)
    expect(identityDirectory.hasVerifiedEmail).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000002',
    )
  })

  it('rejects an unverified email', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
    vi.mocked(identityDirectory.hasVerifiedEmail).mockResolvedValueOnce(false)
    const guard = new SetupSubjectGuard(identityDirectory)

    await expect(
      guard.canActivate(createContext(createSubject({ emailVerified: false }))),
    ).rejects.toThrow(UnauthorizedException)
  })

  it.each([
    ['missing email', { email: undefined }],
    ['blank email', { email: '   ' }],
    ['missing authentication time', { authenticatedAt: undefined }],
    ['authentication older than ten minutes', { authenticatedAt: nowSeconds - 601 }],
    ['authentication time in the future', { authenticatedAt: nowSeconds + 1 }],
  ] satisfies Array<[string, Partial<VerifiedSubject>]>)('rejects %s', async (_name, overrides) => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
    const guard = new SetupSubjectGuard(identityDirectory)

    await expect(guard.canActivate(createContext(createSubject(overrides)))).rejects.toThrow(
      UnauthorizedException,
    )
  })

  it('rejects a request without an authenticated subject', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
    const guard = new SetupSubjectGuard(identityDirectory)

    await expect(guard.canActivate(createContext())).rejects.toThrow(UnauthorizedException)
  })
})
