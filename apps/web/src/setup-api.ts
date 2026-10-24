import type Keycloak from "keycloak-js";

const api = import.meta.env.VITE_CORE_API_URL ?? "http://127.0.0.1:3100";

export interface SetupOperation {
  id: string;
  status:
    | "pending"
    | "processing"
    | "awaiting_owner"
    | "succeeded"
    | "needs_attention";
  stages: { name: string; status: string }[];
  safeErrorCode: string | null;
  organizationId: string;
  reauthenticationRequired: boolean;
  correlationId: string;
}

export type CurrentSetup =
  | { state: "unclaimed" | "claimed" }
  | { state: "operation"; operation: SetupOperation };

export interface SetupStatus {
  setupRequired: boolean;
  phase: "new" | "in_progress" | "ready";
}

export async function setupStatus(signal?: AbortSignal): Promise<SetupStatus> {
  const value = await request<unknown>("/api/v1/setup/status", undefined, {
    signal,
  });
  if (!value || typeof value !== "object") {
    throw new Error("SETUP_STATUS_INVALID");
  }
  const setupRequired = Reflect.get(value, "setupRequired");
  const reportedPhase = Reflect.get(value, "phase");
  if (typeof setupRequired !== "boolean") {
    throw new Error("SETUP_STATUS_INVALID");
  }
  // Older Core APIs only report setupRequired during a staggered local upgrade.
  const phase = reportedPhase ?? (setupRequired ? "new" : "ready");
  if (
    (phase !== "new" && phase !== "in_progress" && phase !== "ready") ||
    (phase === "ready") !== !setupRequired
  ) {
    throw new Error("SETUP_STATUS_INVALID");
  }
  return { setupRequired, phase };
}

export async function currentSetup(
  keycloak: Keycloak,
  signal?: AbortSignal,
): Promise<CurrentSetup> {
  return request("/api/v1/setup/current", keycloak, { signal });
}

export async function claimSetup(
  keycloak: Keycloak,
  secret: string,
  key: string,
): Promise<void> {
  await request("/api/v1/setup/claim", keycloak, {
    method: "POST",
    headers: { "Idempotency-Key": key, "X-Bubllio-Setup-Secret": secret },
    body: "{}",
  });
}

export async function createFirstOrganization(
  keycloak: Keycloak,
  displayName: string,
  key: string,
): Promise<SetupOperation> {
  return request("/api/v1/setup/organization", keycloak, {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify({ displayName }),
  });
}

export async function readSetupOperation(
  keycloak: Keycloak,
  id: string,
  signal?: AbortSignal,
): Promise<SetupOperation> {
  return request(
    `/api/v1/setup/operations/${encodeURIComponent(id)}`,
    keycloak,
    { signal },
  );
}

export async function retrySetupOperation(
  keycloak: Keycloak,
  id: string,
  secret: string,
): Promise<SetupOperation> {
  return request(
    `/api/v1/setup/operations/${encodeURIComponent(id)}/retry`,
    keycloak,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": crypto.randomUUID(),
        "X-Bubllio-Setup-Secret": secret,
      },
      body: "{}",
    },
  );
}

async function request<T>(
  path: string,
  keycloak?: Keycloak,
  options: RequestInit = {},
): Promise<T> {
  if (keycloak) {
    await keycloak.updateToken(30);
    if (!keycloak.token) throw new Error("SESSION_EXPIRED");
  }
  const response = await fetch(`${api}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...(keycloak ? { Authorization: `Bearer ${keycloak.token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const code =
      typeof body === "object" && body !== null
        ? Reflect.get(body, "code")
        : undefined;
    throw new Error(
      typeof code === "string" ? code : `HTTP_${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}
