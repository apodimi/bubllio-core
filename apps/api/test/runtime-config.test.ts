import { describe, expect, it } from 'vitest'

import { parseRuntimeConfig } from '../src/config/runtime-config.schema.js'

const valid = {
  NODE_ENV: 'production',
  PORT: '3100',
  WEB_ORIGIN: 'https://core.example.test',
  DATABASE_URL: 'postgresql://core:secret@database:5432/core',
  OIDC_ISSUER: 'https://identity.example.test/realms/bubllio',
  OIDC_AUDIENCE: 'bubllio-core-api',
  OIDC_JWKS_URL: 'http://keycloak:8080/realms/bubllio/protocol/openid-connect/certs',
  CORE_APPLICATION_MANIFEST_PATH: '/run/bubllio/applications.json',
} as const

describe('runtime configuration', () => {
  it('returns one immutable typed production contract', () => {
    const config = parseRuntimeConfig(valid)

    expect(config).toMatchObject({
      environment: 'production',
      port: 3100,
      webOrigin: 'https://core.example.test',
      localApplicationRegistrationEnabled: false,
    })
    expect(Object.isFrozen(config)).toBe(true)
    expect(Object.isFrozen(config.oidc)).toBe(true)
  })

  it.each([
    ['missing database URL', { ...valid, DATABASE_URL: undefined }],
    ['insecure public origin', { ...valid, WEB_ORIGIN: 'http://core.example.test' }],
    ['loopback public origin', { ...valid, WEB_ORIGIN: 'https://127.0.0.1:5174' }],
    ['local registration in production', { ...valid, CORE_LOCAL_APP_REGISTRATION_ENABLED: 'true' }],
    ['relative production manifest', { ...valid, CORE_APPLICATION_MANIFEST_PATH: './apps.json' }],
    ['invalid boolean', { ...valid, CORE_SETUP_CLAIM_ENABLED: 'yes' }],
    ['claim without setup proof', { ...valid, CORE_SETUP_CLAIM_ENABLED: 'true' }],
    [
      'claim without identity administration',
      {
        ...valid,
        CORE_SETUP_CLAIM_ENABLED: 'true',
        CORE_SETUP_SECRET_SHA256: 'a'.repeat(64),
        CORE_SETUP_SECRET_EXPIRES_AT: '2099-01-01T00:00:00.000Z',
      },
    ],
  ])('rejects %s', (_name, environment) => {
    expect(() => parseRuntimeConfig(environment)).toThrow()
  })

  it('allows a production claim only with out-of-band proof and identity administration', () => {
    const config = parseRuntimeConfig({
      ...valid,
      CORE_SETUP_CLAIM_ENABLED: 'true',
      CORE_SETUP_SECRET_SHA256: 'a'.repeat(64),
      CORE_SETUP_SECRET_EXPIRES_AT: '2099-01-01T00:00:00.000Z',
      CORE_KEYCLOAK_ADMIN_URL: 'http://keycloak:8080',
      CORE_KEYCLOAK_CLIENT_SECRET: 'production-client-secret',
      CORE_IDENTITY_SETUP_AGENT_URL: 'http://identity-setup-agent:3200',
      CORE_IDENTITY_SETUP_AGENT_TOKEN: 'a'.repeat(32),
    })

    expect(config.setup).toMatchObject({ claimEnabled: true, localRehearsal: false })
  })

  it('allows adapter-owned internal HTTP routes without assuming a service hostname', () => {
    const config = parseRuntimeConfig({
      ...valid,
      OIDC_JWKS_URL:
        'http://identity.identity-system.svc.cluster.local:8080/realms/bubllio/protocol/openid-connect/certs',
    })

    expect(config.oidc.jwksUrl).toContain('identity-system.svc.cluster.local')
  })

  it('preserves the local rehearsal defaults while requiring core dependencies', () => {
    const config = parseRuntimeConfig({
      DATABASE_URL: 'postgresql://core:test@database:5432/core',
      OIDC_AUDIENCE: 'bubllio-core-api',
      OIDC_ISSUER: 'http://127.0.0.1:8180/realms/bubllio',
    })

    expect(config).toMatchObject({
      environment: 'development',
      port: 3100,
      webOrigin: 'http://127.0.0.1:5174',
    })
  })

  it('treats empty optional Compose values as absent', () => {
    const config = parseRuntimeConfig({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://core:test@database:5432/core',
      OIDC_AUDIENCE: 'bubllio-core-api',
      OIDC_ISSUER: 'http://127.0.0.1:8180/realms/bubllio',
      CORE_SETUP_SECRET_SHA256: '',
      CORE_SETUP_SECRET_EXPIRES_AT: '',
      CORE_KEYCLOAK_ADMIN_URL: '',
      CORE_KEYCLOAK_CLIENT_SECRET: '',
      CORE_IDENTITY_SETUP_AGENT_URL: '',
      CORE_IDENTITY_SETUP_AGENT_TOKEN: '',
      CORE_APPLICATION_MANIFEST_PATH: '',
    })

    expect(config.setup.secretSha256).toBeUndefined()
    expect(config.setup.secretExpiresAt).toBeUndefined()
    expect(config.keycloak.clientSecret).toBeUndefined()
    expect(config.keycloak.adminUrl).toBeUndefined()
    expect(config.identitySetupAgent.url).toBeUndefined()
    expect(config.identitySetupAgent.token).toBeUndefined()
    expect(config.applicationManifestPath).toBeUndefined()
  })
})
