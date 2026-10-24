import type { RuntimeConfig } from '../src/config/runtime-config.js'

export function runtimeConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    environment: 'test',
    port: 3100,
    webOrigin: 'http://127.0.0.1:5174',
    databaseUrl: 'postgresql://core:test@database:5432/core',
    oidc: {
      audience: 'bubllio-core-api',
      issuer: 'https://identity.example.test/realms/bubllio',
      jwksUrl: 'https://identity.example.test/realms/bubllio/protocol/openid-connect/certs',
    },
    setup: { claimEnabled: false, localRehearsal: false },
    keycloak: {},
    localApplicationRegistrationEnabled: false,
    ...overrides,
  }
}
