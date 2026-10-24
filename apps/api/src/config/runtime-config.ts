import type { OidcConfig } from '../auth/oidc/oidc.types.js'

export const RUNTIME_CONFIG = Symbol('RUNTIME_CONFIG')

export type RuntimeEnvironment = 'development' | 'test' | 'production'

export interface RuntimeConfig {
  readonly environment: RuntimeEnvironment
  readonly port: number
  readonly webOrigin: string
  readonly databaseUrl: string
  readonly oidc: Readonly<OidcConfig>
  readonly setup: Readonly<{
    claimEnabled: boolean
    localRehearsal: boolean
    secretSha256?: string
    secretExpiresAt?: Date
  }>
  readonly keycloak: Readonly<{
    adminUrl?: string
    clientSecret?: string
  }>
  readonly applicationManifestPath?: string
  readonly localApplicationRegistrationEnabled: boolean
}

export type RuntimeEnvironmentSource = Readonly<Record<string, string | undefined>>
