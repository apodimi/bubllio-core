import { ForbiddenException, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { describe, expect, it } from 'vitest'

import { OrganizationContextGuard } from '../src/authorization/organization-context.guard.js'
import { ORGANIZATION_PARAM_KEY } from '../src/authorization/require-organization-context.decorator.js'
import type { AuthenticatedRequest } from '../src/auth/identity.types.js'

function createContext(request: AuthenticatedRequest): ExecutionContext {
  const handler = () => undefined
  Reflect.defineMetadata(ORGANIZATION_PARAM_KEY, 'organizationId', handler)

  return {
    getClass: () => class TestController {},
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext
}

describe('OrganizationContextGuard', () => {
  it('denies a verified subject without the route organization', () => {
    const guard = new OrganizationContextGuard(new Reflector())
    const request: AuthenticatedRequest = {
      headers: {},
      identity: {
        audience: ['bubllio-core-api'],
        authenticatedAt: undefined,
        email: undefined,
        emailVerified: undefined,
        issuer: 'https://identity.example.test/realms/bubllio',
        organization: {},
        subject: '00000000-0000-0000-0000-000000000002',
      },
      params: {
        organizationId: '00000000-0000-0000-0000-000000000001',
      },
    }

    expect(() => guard.canActivate(createContext(request))).toThrow(ForbiddenException)
  })

  it('allows only an exact immutable route organization identifier', () => {
    const guard = new OrganizationContextGuard(new Reflector())
    const request: AuthenticatedRequest = {
      headers: {},
      identity: {
        audience: ['bubllio-core-api'],
        authenticatedAt: undefined,
        email: undefined,
        emailVerified: undefined,
        issuer: 'https://identity.example.test/realms/bubllio',
        organization: {
          mutableAlias: { id: '00000000-0000-0000-0000-000000000001' },
        },
        subject: '00000000-0000-0000-0000-000000000002',
      },
      params: {
        organizationId: '00000000-0000-0000-0000-000000000001',
      },
    }

    expect(guard.canActivate(createContext(request))).toBe(true)

    request.params = { organizationId: 'mutableAlias' }
    expect(() => guard.canActivate(createContext(request))).toThrow(ForbiddenException)
  })
})
