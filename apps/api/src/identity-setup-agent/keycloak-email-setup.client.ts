import { Inject, Injectable } from '@nestjs/common'
import type { EmailTestInput } from '../email-delivery/email-delivery.types.js'
import {
  IDENTITY_SETUP_AGENT_CONFIG,
  type IdentitySetupAgentConfig,
} from './identity-setup-agent.config.js'

const REALM = 'bubllio'
const BOOTSTRAP = 'bubllio-identity-bootstrap'
const RUNTIME = 'bubllio-core-runtime'
const FP = 'bubllio.email_delivery_fingerprint'
const STAGE = 'bubllio.email_delivery_stage'
interface Realm {
  registrationAllowed?: boolean
  smtpServer?: Record<string, string>
  attributes?: Record<string, string>
}
export class KeycloakAgentError extends Error {}

@Injectable()
export class KeycloakEmailSetupClient {
  constructor(
    @Inject(IDENTITY_SETUP_AGENT_CONFIG) private readonly config: IdentitySetupAgentConfig,
  ) {}

  async configureTest(input: EmailTestInput, fingerprint: string): Promise<void> {
    const token = await this.token(BOOTSTRAP, this.config.bootstrapClientSecret)
    const realm = await this.realm(token)
    realm.registrationAllowed = false
    realm.smtpServer = smtp(input)
    realm.attributes = {
      ...(realm.attributes ?? {}),
      [FP]: fingerprint,
      [STAGE]: 'AWAITING_CONFIRMATION',
    }
    await this.updateRealm(token, realm)
  }

  async finalize(fingerprint: string): Promise<void> {
    let bootstrap: string | undefined
    try {
      bootstrap = await this.token(BOOTSTRAP, this.config.bootstrapClientSecret)
    } catch (error) {
      if (!(error instanceof KeycloakAgentError && error.message === 'INVALID_CLIENT')) throw error
    }
    if (bootstrap) {
      const realm = await this.realm(bootstrap)
      requireFingerprint(realm, fingerprint)
      realm.registrationAllowed = true
      realm.attributes = { ...(realm.attributes ?? {}), [FP]: fingerprint, [STAGE]: 'READY' }
      await this.updateRealm(bootstrap, realm)
      await this.disableBootstrapClient(bootstrap)
      await this.requireBootstrapRetired()
    }
    const runtime = await this.token(RUNTIME, this.config.runtimeClientSecret)
    const realm = await this.realm(runtime)
    requireFingerprint(realm, fingerprint)
    if (realm.attributes?.[STAGE] !== 'READY' || realm.registrationAllowed !== true)
      throw new KeycloakAgentError('RECONCILIATION_FAILED')
  }

  private async disableBootstrapClient(token: string): Promise<void> {
    const response = await this.request(
      `/admin/realms/${REALM}/clients?clientId=${BOOTSTRAP}&max=2`,
      { headers: bearer(token) },
    )
    const clients: unknown = response.ok ? await response.json().catch(() => undefined) : undefined
    if (!Array.isArray(clients) || clients.length !== 1 || typeof clients[0]?.id !== 'string')
      throw new KeycloakAgentError('CLIENT_NOT_UNIQUE')
    const disabled = await this.request(`/admin/realms/${REALM}/clients/${clients[0].id}`, {
      method: 'PUT',
      headers: { ...bearer(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...clients[0], enabled: false, serviceAccountsEnabled: false }),
    })
    if (disabled.status !== 204) throw new KeycloakAgentError('RETIREMENT_FAILED')
  }

  private async requireBootstrapRetired(): Promise<void> {
    try {
      await this.token(BOOTSTRAP, this.config.bootstrapClientSecret)
    } catch (error) {
      if (error instanceof KeycloakAgentError && error.message === 'INVALID_CLIENT') return
      throw error
    }
    throw new KeycloakAgentError('RETIREMENT_NOT_PROVEN')
  }

  private async token(clientId: string, clientSecret: string): Promise<string> {
    const response = await this.request(`/realms/${REALM}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    if (response.status === 400 || response.status === 401)
      throw new KeycloakAgentError('INVALID_CLIENT')
    const body: unknown = response.ok ? await response.json().catch(() => undefined) : undefined
    const accessToken =
      typeof body === 'object' && body !== null ? Reflect.get(body, 'access_token') : undefined
    if (typeof accessToken !== 'string' || !accessToken)
      throw new KeycloakAgentError('KEYCLOAK_UNAVAILABLE')
    return accessToken
  }

  private async realm(token: string): Promise<Realm> {
    const response = await this.request(`/admin/realms/${REALM}`, { headers: bearer(token) })
    const body: unknown = response.ok ? await response.json().catch(() => undefined) : undefined
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new KeycloakAgentError('KEYCLOAK_UNAVAILABLE')
    return body as Realm
  }
  private async updateRealm(token: string, realm: Realm): Promise<void> {
    const response = await this.request(`/admin/realms/${REALM}`, {
      method: 'PUT',
      headers: { ...bearer(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(realm),
    })
    if (response.status !== 204) throw new KeycloakAgentError('KEYCLOAK_UNAVAILABLE')
  }
  private async request(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(new URL(path, this.config.keycloakAdminUrl), {
        ...init,
        signal: AbortSignal.timeout(8_000),
      })
    } catch {
      throw new KeycloakAgentError('KEYCLOAK_UNAVAILABLE')
    }
  }
}

function smtp(input: EmailTestInput): Record<string, string> {
  return {
    host: input.host,
    port: String(input.port),
    from: input.senderEmail,
    fromDisplayName: input.senderName,
    ...(input.replyToEmail ? { replyTo: input.replyToEmail } : {}),
    auth: String(input.authentication),
    ...(input.username ? { user: input.username } : {}),
    ...(input.authentication ? { password: '${vault.smtp_password}' } : {}),
    ssl: String(input.security === 'tls'),
    starttls: String(input.security === 'starttls'),
  }
}
function bearer(token: string) {
  return { Authorization: `Bearer ${token}` }
}
function requireFingerprint(realm: Realm, fingerprint: string): void {
  if (realm.attributes?.[FP] !== fingerprint) throw new KeycloakAgentError('FINGERPRINT_MISMATCH')
}
