import { readFileSync } from 'node:fs'
import { isAbsolute } from 'node:path'

export const IDENTITY_SETUP_AGENT_CONFIG = Symbol('IDENTITY_SETUP_AGENT_CONFIG')

export interface IdentitySetupAgentConfig {
  readonly port: number
  readonly token: string
  readonly keycloakAdminUrl: string
  readonly bootstrapClientSecret: string
  readonly runtimeClientSecret: string
  readonly vaultDirectory: string
  readonly allowInsecureSmtp: boolean
}

export function loadIdentitySetupAgentConfig(): IdentitySetupAgentConfig {
  return parseIdentitySetupAgentConfig(process.env)
}

export function parseIdentitySetupAgentConfig(
  environment: Readonly<Record<string, string | undefined>>,
): IdentitySetupAgentConfig {
  const port = parsePort(environment.PORT ?? '3200')
  const token = readSecretFile(
    environment.IDENTITY_SETUP_AGENT_TOKEN_FILE,
    'IDENTITY_SETUP_AGENT_TOKEN_FILE',
  )
  const bootstrapClientSecret = readSecretFile(
    environment.KEYCLOAK_BOOTSTRAP_CLIENT_SECRET_FILE,
    'KEYCLOAK_BOOTSTRAP_CLIENT_SECRET_FILE',
  )
  const runtimeClientSecret = readSecretFile(
    environment.KEYCLOAK_RUNTIME_CLIENT_SECRET_FILE,
    'KEYCLOAK_RUNTIME_CLIENT_SECRET_FILE',
  )
  const keycloakAdminUrl = parseAdminUrl(environment.KEYCLOAK_ADMIN_URL)
  const vaultDirectory = environment.KEYCLOAK_VAULT_DIR ?? '/opt/keycloak/vault'
  if (!isAbsolute(vaultDirectory)) throw new Error('KEYCLOAK_VAULT_DIR must be absolute')
  if (token.length < 32 || token.length > 512)
    throw new Error('Identity setup agent token must contain 32 to 512 characters')
  return Object.freeze({
    port,
    token,
    keycloakAdminUrl,
    bootstrapClientSecret,
    runtimeClientSecret,
    vaultDirectory,
    allowInsecureSmtp: environment.IDENTITY_SETUP_AGENT_ALLOW_INSECURE_SMTP === 'true',
  })
}

function readSecretFile(path: string | undefined, name: string): string {
  if (!path || !isAbsolute(path)) throw new Error(`${name} must be an absolute path`)
  const value = readFileSync(path, 'utf8').trim()
  if (value.length < 16 || value.length > 512) throw new Error(`${name} contains an invalid secret`)
  return value
}

function parseAdminUrl(value: string | undefined): string {
  if (!value) throw new Error('KEYCLOAK_ADMIN_URL must be configured')
  const url = new URL(value)
  if (url.username || url.password || url.search || url.hash)
    throw new Error('KEYCLOAK_ADMIN_URL is invalid')
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'keycloak'))
    throw new Error('KEYCLOAK_ADMIN_URL must use HTTPS or the private keycloak service')
  return value.replace(/\/$/u, '')
}

function parsePort(value: string): number {
  if (!/^\d{1,5}$/u.test(value)) throw new Error('PORT is invalid')
  const port = Number(value)
  if (port < 1 || port > 65_535) throw new Error('PORT is invalid')
  return port
}
