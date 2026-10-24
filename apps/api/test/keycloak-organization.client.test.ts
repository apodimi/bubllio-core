import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  KeycloakOrganizationClient,
  ProvisioningError,
} from '../src/setup/keycloak-organization.client.js'

const coreId = '00000000-0000-0000-0000-000000000001'
const identityId = '00000000-0000-0000-0000-000000000011'
const subject = '00000000-0000-0000-0000-000000000002'
const marker = { id: identityId, attributes: { 'bubllio.core.organization_id': [coreId] } }

function response(status: number, body?: unknown): Response {
  return { status, json: async () => body } as Response
}

describe('Keycloak first-organization adapter', () => {
  const client = new KeycloakOrganizationClient()
  const fetchMock = vi.fn()

  beforeEach(() => {
    process.env.CORE_KEYCLOAK_ADMIN_URL = 'http://keycloak:8080'
    process.env.CORE_KEYCLOAK_CLIENT_SECRET = 'test-machine-secret'
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CORE_KEYCLOAK_ADMIN_URL
    delete process.env.CORE_KEYCLOAK_CLIENT_SECRET
  })

  it('adopts only an exact immutable marker and does not create a duplicate', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { access_token: 'machine-token' }))
      .mockResolvedValueOnce(response(200, [marker]))

    expect(await client.ensureOrganization(coreId, 'org-one', 'Example')).toBe(identityId)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1][0])).toContain('q=bubllio.core.organization_id%3A')
  })

  it('creates then resolves the organization by marker', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { access_token: 'machine-token' }))
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, { access_token: 'machine-token' }))
      .mockResolvedValueOnce(response(201))
      .mockResolvedValueOnce(response(200, { access_token: 'machine-token' }))
      .mockResolvedValueOnce(response(200, [marker]))

    expect(await client.ensureOrganization(coreId, 'org-one', 'Example')).toBe(identityId)
    expect(fetchMock.mock.calls[3][1].body).toContain(coreId)
  })

  it('invites the existing exact subject without a user-management write permission', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { access_token: 'machine-token' }))
      .mockResolvedValueOnce(response(404))
      .mockResolvedValueOnce(response(200, { access_token: 'machine-token' }))
      .mockResolvedValueOnce(response(204))

    await expect(client.ensureMember(identityId, subject)).rejects.toMatchObject({
      code: 'OWNER_INVITATION_PENDING',
    })
    expect(String(fetchMock.mock.calls[3][0])).toContain('invite-existing-user')
    expect(fetchMock.mock.calls[3][1].body.toString()).toBe(`id=${subject}`)
  })

  it('treats an accepted invitation as completed membership on retry', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { access_token: 'machine-token' }))
      .mockResolvedValueOnce(response(200, { id: subject }))

    await expect(client.ensureMember(identityId, subject)).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not adopt a matching alias without the marker', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { access_token: 'machine-token' }))
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, { access_token: 'machine-token' }))
      .mockResolvedValueOnce(response(409))
      .mockResolvedValueOnce(response(200, { access_token: 'machine-token' }))
      .mockResolvedValueOnce(response(200, []))

    await expect(client.ensureOrganization(coreId, 'org-one', 'Example')).rejects.toThrow(
      ProvisioningError,
    )
  })
})
