import type Keycloak from "keycloak-js";

export interface WorkspaceOrganization {
  id: string;
  displayName: string;
}

export interface WorkspaceApplication {
  key: string;
  displayName: string;
  launchUrl: string;
}

const coreApiUrl = import.meta.env.VITE_CORE_API_URL ?? "http://127.0.0.1:3100";

/** Reads Core using a fresh in-memory OIDC token; no credential is persisted. */
async function getFromCore<T>(
  keycloak: Keycloak,
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  await keycloak.updateToken(30);
  if (!keycloak.token) {
    throw new Error("SESSION_EXPIRED");
  }

  const response = await fetch(`${coreApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${keycloak.token}` },
    signal,
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401 ? "SESSION_EXPIRED" : "CORE_UNAVAILABLE",
    );
  }
  return response.json() as Promise<T>;
}

export function getWorkspaceOrganizations(
  keycloak: Keycloak,
  signal?: AbortSignal,
): Promise<WorkspaceOrganization[]> {
  return getFromCore(keycloak, "/api/v1/me/organizations", signal);
}

export function getWorkspaceApplications(
  keycloak: Keycloak,
  organizationId: string,
  signal?: AbortSignal,
): Promise<WorkspaceApplication[]> {
  return getFromCore(
    keycloak,
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/applications`,
    signal,
  );
}
