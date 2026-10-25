import { NotFoundException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import type { RuntimeConfig } from '../src/config/runtime-config.js'
import { SetupAvailabilityGuard } from '../src/setup/guards/setup-availability.guard.js'

function config(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    environment: 'production',
    port: 3100,
    webOrigin: 'https://core.example.test',
    databaseUrl: 'postgresql://core:secret@database:5432/core',
    oidc: {
      issuer: 'https://identity.example.test/realms/bubllio',
      audience: 'bubllio-core-api',
    },
    setup: {
      claimEnabled: true,
      localRehearsal: false,
      secretSha256: 'a'.repeat(64),
      secretExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
    },
    keycloak: {
      adminUrl: 'http://keycloak:8080',
      clientSecret: 'production-client-secret',
    },
    applicationManifestPath: '/run/config/applications.json',
    localApplicationRegistrationEnabled: false,
    ...overrides,
  }
}

describe('setup availability', () => {
  it('allows an explicitly enabled production installation claim', () => {
    const guard = new SetupAvailabilityGuard(config())

    expect(guard.canActivate({} as never)).toBe(true)
  })

  it('hides setup when the installation claim is disabled', () => {
    const current = config()
    const guard = new SetupAvailabilityGuard({
      ...current,
      setup: { ...current.setup, claimEnabled: false },
    })

    expect(() => guard.canActivate({} as never)).toThrow(NotFoundException)
  })

  it('keeps non-production setup limited to an explicit loopback rehearsal', () => {
    const current = config()
    const guard = new SetupAvailabilityGuard({
      ...current,
      environment: 'development',
      webOrigin: 'https://core.example.test',
    })

    expect(() => guard.canActivate({} as never)).toThrow(NotFoundException)
  })
})
