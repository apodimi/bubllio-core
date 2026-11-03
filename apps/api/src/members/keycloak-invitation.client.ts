import { Inject, Injectable } from '@nestjs/common'

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'
import {
  ProvisioningError,
  providerError,
  requestKeycloakAdmin,
} from '../identity/keycloak-admin.transport.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

/** Narrow invitation and membership operations for Core member administration. */
@Injectable()
export class KeycloakInvitationClient {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  async inviteMember(organizationId: string, email: string): Promise<string> {
    if (!UUID.test(organizationId)) throw new ProvisioningError('SETUP_REPAIR_REQUIRED')
    const pending = await this.findInvitation(organizationId, email)
    if (pending?.status === 'PENDING') return pending.id
    if (pending?.status === 'EXPIRED') return this.resendMemberInvitation(organizationId, email)
    const response = await this.request(
      'POST',
      `/admin/realms/bubllio/organizations/${organizationId}/members/invite-user`,
      new URLSearchParams({ email }),
    )
    if (response.status !== 204 && response.status !== 409) throw providerError(response.status)
    const sent = await this.findInvitation(organizationId, email)
    if (sent?.status !== 'PENDING') throw providerError(response.status)
    return sent.id
  }

  async resendMemberInvitation(organizationId: string, email: string): Promise<string> {
    const invitation = await this.findInvitation(organizationId, email)
    if (!invitation) return this.inviteMember(organizationId, email)
    const response = await this.request(
      'POST',
      `/admin/realms/bubllio/organizations/${organizationId}/invitations/${invitation.id}/resend`,
    )
    if (response.status !== 204) throw providerError(response.status)
    const rotated = await this.findInvitation(organizationId, email)
    if (rotated?.status !== 'PENDING')
      throw new ProvisioningError('KEYCLOAK_TEMPORARILY_UNAVAILABLE')
    return rotated.id
  }

  async revokeMemberInvitation(organizationId: string, email: string): Promise<void> {
    const invitation = await this.findInvitation(organizationId, email)
    if (!invitation) return
    const response = await this.request(
      'DELETE',
      `/admin/realms/bubllio/organizations/${organizationId}/invitations/${invitation.id}`,
    )
    if (response.status !== 204 && response.status !== 404) throw providerError(response.status)
  }

  async isMember(organizationId: string, subject: string): Promise<boolean> {
    if (!UUID.test(organizationId) || !UUID.test(subject)) return false
    const response = await this.request(
      'GET',
      `/admin/realms/bubllio/organizations/${organizationId}/members/${subject}`,
    )
    if (response.status === 404) return false
    if (response.status !== 200) throw providerError(response.status)
    return true
  }

  async findSubjectByEmail(email: string): Promise<string | undefined> {
    const query = new URLSearchParams({ email, exact: 'true', max: '2' })
    const response = await this.request('GET', `/admin/realms/bubllio/users?${query}`)
    if (response.status !== 200) throw providerError(response.status)
    const body: unknown = await response.json().catch(() => undefined)
    if (!Array.isArray(body)) throw new ProvisioningError('KEYCLOAK_TEMPORARILY_UNAVAILABLE')
    const matches = body.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof Reflect.get(item, 'email') === 'string' &&
        Reflect.get(item, 'email').toLowerCase() === email.toLowerCase() &&
        typeof Reflect.get(item, 'id') === 'string' &&
        UUID.test(Reflect.get(item, 'id')),
    )
    if (matches.length > 1) throw new ProvisioningError('SETUP_REPAIR_REQUIRED')
    return matches[0] ? (Reflect.get(matches[0], 'id') as string) : undefined
  }

  private async findInvitation(organizationId: string, email: string) {
    const matches: Array<{ id: string; status: string }> = []
    for (let first = 0; first < 1000; first += 100) {
      const query = new URLSearchParams({ first: String(first), max: '100' })
      const response = await this.request(
        'GET',
        `/admin/realms/bubllio/organizations/${organizationId}/invitations?${query}`,
      )
      if (response.status !== 200) throw providerError(response.status)
      const body: unknown = await response.json().catch(() => undefined)
      if (!Array.isArray(body)) throw new ProvisioningError('KEYCLOAK_TEMPORARILY_UNAVAILABLE')
      for (const item of body) {
        if (!item || typeof item !== 'object') continue
        const foundEmail = Reflect.get(item, 'email')
        const foundId = Reflect.get(item, 'id')
        if (
          typeof foundEmail === 'string' &&
          foundEmail.toLowerCase() === email.toLowerCase() &&
          typeof foundId === 'string' &&
          UUID.test(foundId)
        ) {
          matches.push({ id: foundId, status: String(Reflect.get(item, 'status')).toUpperCase() })
        }
      }
      if (matches.length > 1) throw new ProvisioningError('SETUP_REPAIR_REQUIRED')
      if (body.length < 100) return matches[0]
    }
    throw new ProvisioningError('KEYCLOAK_TEMPORARILY_UNAVAILABLE')
  }

  private request(method: string, path: string, body?: unknown): Promise<Response> {
    return requestKeycloakAdmin(this.config, method, path, body)
  }
}
