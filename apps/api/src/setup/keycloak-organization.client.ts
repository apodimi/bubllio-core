import { Inject, Injectable } from '@nestjs/common'

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'
import {
  ProvisioningError,
  providerError,
  requestKeycloakAdmin,
} from '../identity/keycloak-admin.transport.js'

export { ProvisioningError } from '../identity/keycloak-admin.transport.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
const MARKER = 'bubllio.core.organization_id'
export type { ProvisioningErrorCode } from '../identity/keycloak-admin.transport.js'

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
    return requestKeycloakAdmin(this.config, method, path, body)
  }
}
