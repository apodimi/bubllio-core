import type Keycloak from "keycloak-js";

export interface CoreIdentity {
  audience: string[];
  issuer: string;
  organization: Record<string, { id?: string }>;
  subject: string;
}

const coreApiUrl = import.meta.env.VITE_CORE_API_URL ?? "http://127.0.0.1:3100";

/** Calls Core with a fresh bearer token without persisting credentials. */
export async function getCurrentIdentity(
  keycloak: Keycloak,
): Promise<CoreIdentity> {
  await keycloak.updateToken(30);

  if (!keycloak.token) {
    throw new Error("No access token is available. Sign in again.");
  }

  const response = await fetch(`${coreApiUrl}/me`, {
    headers: { Authorization: `Bearer ${keycloak.token}` },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      { message?: string } | undefined;
    throw new Error(body?.message ?? `Core API returned ${response.status}`);
  }

  return response.json() as Promise<CoreIdentity>;
}
