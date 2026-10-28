import { type ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AuthService } from '../src/auth/auth.service.js'
import { AuthenticationGuard } from '../src/auth/guards/authentication.guard.js'

describe('AuthenticationGuard token rejection telemetry', () => {
  const authService = { verify: vi.fn() }
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) }
  const warning = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  const guard = new AuthenticationGuard(
    authService as unknown as AuthService,
    reflector as unknown as Reflector,
  )
  const request = { headers: { authorization: 'Bearer test-token' } }
  const context = {
    getHandler: () => () => undefined,
    getClass: () => AuthenticationGuard,
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext

  afterEach(() => vi.clearAllMocks())

  it('names only the rejected claim without logging its value or token', async () => {
    authService.verify.mockRejectedValueOnce(
      new Error("Token claim 'organization' must contain a non-empty id"),
    )

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
    expect(warning).toHaveBeenCalledWith('Rejected bearer token (InvalidClaim:organization)')
    expect(warning.mock.calls.flat().join(' ')).not.toContain('test-token')
  })

  it('does not log arbitrary verifier error messages', async () => {
    authService.verify.mockRejectedValueOnce(new Error('private detail'))

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
    expect(warning).toHaveBeenCalledWith('Rejected bearer token (Error)')
    expect(warning.mock.calls.flat().join(' ')).not.toContain('private detail')
  })
})
