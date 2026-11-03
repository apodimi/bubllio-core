import type { RuntimeConfig } from '../config/runtime-config.js'

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

/** Runtime-only Keycloak Admin REST transport; does not expose tokens to callers. */
export async function requestKeycloakAdmin(
  config: RuntimeConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const baseUrl = config.keycloak.adminUrl
  const clientSecret = config.keycloak.clientSecret
  if (!baseUrl || !clientSecret) throw new ProvisioningError('KEYCLOAK_CREDENTIALS_INVALID')
  let base: URL
  try {
    base = new URL(baseUrl)
  } catch {
    throw new ProvisioningError('KEYCLOAK_CREDENTIALS_INVALID')
  }
  if (base.protocol !== 'https:' && base.hostname !== 'keycloak' && base.hostname !== '127.0.0.1') {
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
      : {
          body: body instanceof URLSearchParams ? body : JSON.stringify(body),
        }),
  })
}

async function safeFetch(url: URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    throw new ProvisioningError('KEYCLOAK_TEMPORARILY_UNAVAILABLE')
  }
}

export function providerError(status: number): ProvisioningError {
  if (status === 401) return new ProvisioningError('KEYCLOAK_CREDENTIALS_INVALID')
  if (status === 403) return new ProvisioningError('KEYCLOAK_PERMISSION_DENIED')
  if (status === 409) return new ProvisioningError('KEYCLOAK_ORGANIZATION_CONFLICT')
  return new ProvisioningError('KEYCLOAK_TEMPORARILY_UNAVAILABLE')
}
