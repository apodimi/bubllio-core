import { isAbsolute } from 'node:path'

import type {
  RuntimeConfig,
  RuntimeEnvironment,
  RuntimeEnvironmentSource,
} from './runtime-config.js'

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u
const AUDIENCE_PATTERN = /^[a-zA-Z0-9_.:-]{2,255}$/u
const DEFAULT_WEB_ORIGIN = 'http://127.0.0.1:5174'

/** Converts the process environment into the API's immutable runtime contract. */
export function parseRuntimeConfig(environment: RuntimeEnvironmentSource): RuntimeConfig {
  const mode = parseEnvironment(environment.NODE_ENV)
  const port = parsePort(environment.PORT)
  const webOrigin = parseUrl(environment.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN, {
    name: 'WEB_ORIGIN',
    production: mode === 'production',
    originOnly: true,
  })
  const databaseUrl = requireValue(environment.DATABASE_URL, 'DATABASE_URL')
  validateDatabaseUrl(databaseUrl, mode)

  const issuer = parseUrl(requireValue(environment.OIDC_ISSUER, 'OIDC_ISSUER'), {
    name: 'OIDC_ISSUER',
    production: mode === 'production',
  })
  const audience = requireValue(environment.OIDC_AUDIENCE, 'OIDC_AUDIENCE')
  if (!AUDIENCE_PATTERN.test(audience)) {
    throw new Error('OIDC_AUDIENCE is invalid')
  }
  const jwksUrl = environment.OIDC_JWKS_URL
    ? parseUrl(environment.OIDC_JWKS_URL, {
        name: 'OIDC_JWKS_URL',
        production: mode === 'production',
        allowInternalHttp: true,
      })
    : undefined

  const claimEnabled = parseBoolean(environment.CORE_SETUP_CLAIM_ENABLED, false)
  const localRehearsal = parseBoolean(environment.CORE_SETUP_LOCAL_REHEARSAL, false)
  const localApplicationRegistrationEnabled = parseBoolean(
    environment.CORE_LOCAL_APP_REGISTRATION_ENABLED,
    false,
  )
  if (mode === 'production' && (localRehearsal || localApplicationRegistrationEnabled)) {
    throw new Error('Local rehearsal and application registration must be disabled in production')
  }

  const secretSha256 = environment.CORE_SETUP_SECRET_SHA256
  if (secretSha256 && !SHA256_HEX_PATTERN.test(secretSha256)) {
    throw new Error('CORE_SETUP_SECRET_SHA256 must be a SHA-256 hex digest')
  }
  const secretExpiresAt = parseOptionalDate(
    environment.CORE_SETUP_SECRET_EXPIRES_AT,
    'CORE_SETUP_SECRET_EXPIRES_AT',
  )
  if ((secretSha256 === undefined) !== (secretExpiresAt === undefined)) {
    throw new Error('Setup secret digest and expiry must be configured together')
  }
  if (claimEnabled && (!secretSha256 || !secretExpiresAt)) {
    throw new Error('Enabled setup claims require a setup secret digest and expiry')
  }

  const adminUrl = environment.CORE_KEYCLOAK_ADMIN_URL
    ? parseUrl(environment.CORE_KEYCLOAK_ADMIN_URL, {
        name: 'CORE_KEYCLOAK_ADMIN_URL',
        production: mode === 'production',
        allowInternalHttp: true,
      })
    : undefined
  const clientSecret = environment.CORE_KEYCLOAK_CLIENT_SECRET
  if ((adminUrl === undefined) !== (clientSecret === undefined)) {
    throw new Error('Keycloak administration URL and client secret must be configured together')
  }
  if (clientSecret !== undefined && clientSecret.length < 16) {
    throw new Error('CORE_KEYCLOAK_CLIENT_SECRET must contain at least 16 characters')
  }
  if (claimEnabled && (!adminUrl || !clientSecret)) {
    throw new Error('Enabled setup claims require Keycloak administration configuration')
  }

  const applicationManifestPath = environment.CORE_APPLICATION_MANIFEST_PATH
  if (mode === 'production' && !applicationManifestPath) {
    throw new Error('CORE_APPLICATION_MANIFEST_PATH must be configured in production')
  }
  if (mode === 'production' && applicationManifestPath && !isAbsolute(applicationManifestPath)) {
    throw new Error('CORE_APPLICATION_MANIFEST_PATH must be absolute in production')
  }

  return Object.freeze({
    environment: mode,
    port,
    webOrigin,
    databaseUrl,
    oidc: Object.freeze({ audience, issuer, jwksUrl }),
    setup: Object.freeze({ claimEnabled, localRehearsal, secretSha256, secretExpiresAt }),
    keycloak: Object.freeze({ adminUrl, clientSecret }),
    applicationManifestPath,
    localApplicationRegistrationEnabled,
  })
}

function parseEnvironment(value: string | undefined): RuntimeEnvironment {
  const environment = value ?? 'development'
  if (environment !== 'development' && environment !== 'test' && environment !== 'production') {
    throw new Error('NODE_ENV must be development, test, or production')
  }
  return environment
}

function parsePort(value: string | undefined): number {
  if (value === undefined) return 3100
  if (!/^\d{1,5}$/u.test(value)) throw new Error('PORT must be an integer from 1 to 65535')
  const port = Number(value)
  if (port < 1 || port > 65_535) throw new Error('PORT must be an integer from 1 to 65535')
  return port
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error('Boolean configuration values must be exactly true or false')
}

function parseOptionalDate(value: string | undefined, name: string): Date | undefined {
  if (value === undefined) return undefined
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${name} must be an ISO-8601 UTC timestamp`)
  }
  return parsed
}

function parseUrl(
  value: string,
  options: {
    name: string
    production: boolean
    originOnly?: boolean
    allowInternalHttp?: boolean
  },
): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${options.name} must be a valid URL`)
  }
  const internalHttp = options.allowInternalHttp && url.protocol === 'http:'
  if (options.production && !options.allowInternalHttp && isLoopback(url.hostname)) {
    throw new Error(`${options.name} must not target loopback in production`)
  }
  if (
    (options.production && url.protocol !== 'https:' && !internalHttp) ||
    (!options.production && url.protocol !== 'https:' && url.protocol !== 'http:')
  ) {
    throw new Error(`${options.name} must use an allowed HTTP scheme`)
  }
  if (url.username || url.password || url.hash || url.search) {
    throw new Error(`${options.name} must not contain credentials, query, or fragment data`)
  }
  if (options.originOnly && (url.pathname !== '/' || value.endsWith('/'))) {
    throw new Error(`${options.name} must be an exact origin without a trailing slash`)
  }
  return value.replace(/\/$/u, '')
}

function validateDatabaseUrl(value: string, environment: RuntimeEnvironment): void {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL')
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL')
  }
  if (environment === 'production' && isLoopback(url.hostname)) {
    throw new Error('DATABASE_URL must not target loopback in production')
  }
}

function isLoopback(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1'
}

function requireValue(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} must be configured`)
  return value
}
