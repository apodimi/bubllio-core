import { Inject, Injectable } from '@nestjs/common'

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
const MARKER = 'bubllio.core.organization_id'
const TIMEOUT_MS = 7000

export type ProvisioningErrorCode =
  | 'KEYCLOAK_TEMPORARILY_UNAVAILABLE'
  | 'KEYCLOAK_CREDENTIALS_INVALID'
  | 'KEYCLOAK_PERMISSION_DENIED'
  | 'KEYCLOAK_ORGANIZATION_CONFLICT'
  | 'OWNER_INVITATION_PENDING'
  | 'SETUP_REPAIR_REQUIRED'

export class ProvisioningError extends Error {
  constructor(readonly code: ProvisioningErrorCode) {
    super(code)
  }
}

interface OrganizationRepresentation {
  id?: unknown
  redirectUrl?: unknown
  attributes?: Record<string, unknown>
}

interface UserRepresentation {
  id?: unknown
  email?: unknown
  emailVerified?: unknown
  enabled?: unknown
}

/** Narrow read/provisioning operations used by the first-run identity boundary. */
@Injectable()
export class KeycloakOrganizationClient {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  /** Counts only enabled, email-verified identities; service accounts have no verified email. */
  async hasVerifiedAccount(): Promise<boolean> {
    const response = await this.request(
      'GET',
      '/admin/realms/bubllio/users/count?emailVerified=true&enabled=true',
    )
    if (response.status !== 200) throw providerError(response.status)
    const count: unknown = await response.json().catch(() => undefined)
    if (!Number.isSafeInteger(count) || (count as number) < 0) {
      throw new ProvisioningError('SETUP_REPAIR_REQUIRED')
    }
    return (count as number) > 0
  }

  /** Confirms setup identity assurance when a legacy access token omits email claims. */
  async hasVerifiedEmail(subject: string): Promise<boolean> {
    if (!UUID.test(subject)) return false
    const response = await this.request(
      'GET',
      `/admin/realms/bubllio/users/${encodeURIComponent(subject)}`,
    )
    if (response.status === 404) return false
    if (response.status !== 200) throw providerError(response.status)
    const user: unknown = await response.json().catch(() => undefined)
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      throw new ProvisioningError('SETUP_REPAIR_REQUIRED')
    }
    const representation = user as UserRepresentation
    return (
      representation.id === subject &&
      representation.enabled === true &&
      representation.emailVerified === true &&
      typeof representation.email === 'string' &&
      representation.email.trim().length > 0
    )
  }

  async ensureOrganization(coreId: string, slug: string, displayName: string): Promise<string> {
    const existing = await this.findByMarker(coreId)
    if (existing) {
      await this.ensureRedirectUrl(existing)
      return existing.id as string
    }

    const response = await this.request('POST', '/admin/realms/bubllio/organizations', {
      alias: slug,
      name: displayName,
      enabled: true,
      redirectUrl: `${this.config.webOrigin}/setup`,
      attributes: { [MARKER]: [coreId] },
    })
    if (response.status !== 201 && response.status !== 409) {
      throw providerError(response.status)
    }

    // A timeout or alias collision can leave an organization behind. Only the
    // immutable marker may be adopted on retry, never a matching display name.
    const created = await this.findByMarker(coreId)
    if (!created) throw new ProvisioningError('KEYCLOAK_ORGANIZATION_CONFLICT')
    await this.ensureRedirectUrl(created)
    return created.id as string
  }

  async ensureMember(organizationId: string, subject: string): Promise<void> {
    if (!UUID.test(organizationId) || !UUID.test(subject)) {
      throw new ProvisioningError('SETUP_REPAIR_REQUIRED')
    }
    const path = `/admin/realms/bubllio/organizations/${organizationId}/members/${subject}`
    const existing = await this.request('GET', path)
    if (existing.status === 200) return
    if (existing.status !== 404) throw providerError(existing.status)

    const invited = await this.request(
      'POST',
      `/admin/realms/bubllio/organizations/${organizationId}/members/invite-existing-user`,
      new URLSearchParams({ id: subject }),
    )
    if (invited.status === 204 || invited.status === 409) {
      throw new ProvisioningError('OWNER_INVITATION_PENDING')
    }
    throw providerError(invited.status)
  }

  private async ensureRedirectUrl(organization: OrganizationRepresentation): Promise<void> {
    const redirectUrl = `${this.config.webOrigin}/setup`
    if (organization.redirectUrl === redirectUrl) return
    const response = await this.request(
      'PUT',
      `/admin/realms/bubllio/organizations/${organization.id}`,
      { ...organization, redirectUrl },
    )
    if (response.status !== 204) throw providerError(response.status)
  }

  private async findByMarker(coreId: string): Promise<OrganizationRepresentation | undefined> {
    const query = new URLSearchParams({
      q: `${MARKER}:${coreId}`,
      max: '2',
      briefRepresentation: 'false',
    })
    const response = await this.request('GET', `/admin/realms/bubllio/organizations?${query}`)
    if (response.status !== 200) throw providerError(response.status)
    const body: unknown = await response.json().catch(() => undefined)
    if (!Array.isArray(body)) throw new ProvisioningError('SETUP_REPAIR_REQUIRED')
    const matches = body.filter(
      (item: OrganizationRepresentation) =>
        Array.isArray(item?.attributes?.[MARKER]) && item.attributes[MARKER].includes(coreId),
    )
    if (matches.length > 1) throw new ProvisioningError('SETUP_REPAIR_REQUIRED')
    const id: unknown = matches[0]?.id
    if (id === undefined) return undefined
    if (typeof id !== 'string' || !UUID.test(id))
      throw new ProvisioningError('SETUP_REPAIR_REQUIRED')
    return matches[0]
  }

  private async request(method: string, path: string, body?: unknown): Promise<Response> {
    const baseUrl = this.config.keycloak.adminUrl
    const clientSecret = this.config.keycloak.clientSecret
    if (!baseUrl || !clientSecret) throw new ProvisioningError('KEYCLOAK_CREDENTIALS_INVALID')
    let base: URL
    try {
      base = new URL(baseUrl)
    } catch {
      throw new ProvisioningError('KEYCLOAK_CREDENTIALS_INVALID')
    }
    if (
      base.protocol !== 'https:' &&
      base.hostname !== 'keycloak' &&
      base.hostname !== '127.0.0.1'
    ) {
      throw new ProvisioningError('KEYCLOAK_CREDENTIALS_INVALID')
    }

    const tokenResponse = await safeFetch(
      new URL('/realms/bubllio/protocol/openid-connect/token', base),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'bubllio-core-runtime',
          client_secret: clientSecret,
        }),
      },
    )
    if (tokenResponse.status !== 200) throw providerError(tokenResponse.status)
    const tokenBody: unknown = await tokenResponse.json().catch(() => undefined)
    const accessToken =
      typeof tokenBody === 'object' && tokenBody !== null
        ? Reflect.get(tokenBody, 'access_token')
        : undefined
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new ProvisioningError('KEYCLOAK_CREDENTIALS_INVALID')
    }
    return safeFetch(new URL(path, base), {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body === undefined
          ? {}
          : {
              'Content-Type':
                body instanceof URLSearchParams
                  ? 'application/x-www-form-urlencoded'
                  : 'application/json',
            }),
      },
      ...(body === undefined
        ? {}
        : { body: body instanceof URLSearchParams ? body : JSON.stringify(body) }),
    })
  }
}

async function safeFetch(url: URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    throw new ProvisioningError('KEYCLOAK_TEMPORARILY_UNAVAILABLE')
  }
}

function providerError(status: number): ProvisioningError {
  if (status === 401) return new ProvisioningError('KEYCLOAK_CREDENTIALS_INVALID')
  if (status === 403) return new ProvisioningError('KEYCLOAK_PERMISSION_DENIED')
  if (status === 409) return new ProvisioningError('KEYCLOAK_ORGANIZATION_CONFLICT')
  return new ProvisioningError('KEYCLOAK_TEMPORARILY_UNAVAILABLE')
}
