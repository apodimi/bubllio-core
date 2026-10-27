import type Keycloak from "keycloak-js";

import { browserRuntimeConfig } from "./runtime-config";

const api = browserRuntimeConfig().coreApiUrl;

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
  registrationRequired: boolean;
}

export type EmailDeliverySecurity = "starttls" | "tls" | "none";

export type EmailDeliverySafeErrorCode =
  | "EMAIL_DELIVERY_UNAVAILABLE"
  | "EMAIL_DELIVERY_AUTHENTICATION_FAILED"
  | "EMAIL_DELIVERY_TLS_FAILED"
  | "EMAIL_DELIVERY_REJECTED"
  | "EMAIL_CONFIRMATION_EXPIRED"
  | "EMAIL_CONFIRMATION_INVALID"
  | "IDENTITY_ACTIVATION_FAILED";

export interface EmailDeliverySettings {
  senderName: string;
  senderEmail: string;
  replyToEmail?: string;
  host: string;
  port: number;
  security: EmailDeliverySecurity;
  authentication: boolean;
  username?: string;
  password?: string;
  testRecipient: string;
}

export type EmailDeliveryStatus =
  | { status: "required" }
  | { status: "awaiting_confirmation" }
  | {
      status: "ready";
      testedAt?: string;
      configuredAt?: string;
    }
  | {
      status: "attention";
      safeErrorCode: EmailDeliverySafeErrorCode;
      confirmationRetryable: boolean;
    };

export interface EmailDeliveryTestResult {
  status: "awaiting_confirmation";
  maskedRecipient: string;
}

export type SystemCheckKey =
  "database" | "identity" | "migrations" | "applications";

export interface SystemPreflight {
  status: "ready" | "attention";
  checks: {
    key: SystemCheckKey;
    status: "ready" | "attention";
    messageCode?: string;
  }[];
}

const systemCheckKeys = new Set<SystemCheckKey>([
  "database",
  "identity",
  "migrations",
  "applications",
]);

const emailDeliverySafeErrorCodes = new Set<EmailDeliverySafeErrorCode>([
  "EMAIL_DELIVERY_UNAVAILABLE",
  "EMAIL_DELIVERY_AUTHENTICATION_FAILED",
  "EMAIL_DELIVERY_TLS_FAILED",
  "EMAIL_DELIVERY_REJECTED",
  "EMAIL_CONFIRMATION_EXPIRED",
  "EMAIL_CONFIRMATION_INVALID",
  "IDENTITY_ACTIVATION_FAILED",
]);

export async function systemPreflight(
  signal?: AbortSignal,
): Promise<SystemPreflight> {
  const value = await request<unknown>("/api/v1/system/preflight", undefined, {
    signal,
  });
  if (!value || typeof value !== "object") {
    throw new Error("SYSTEM_PREFLIGHT_INVALID");
  }

  const status = Reflect.get(value, "status");
  const checks = Reflect.get(value, "checks");
  if (
    (status !== "ready" && status !== "attention") ||
    !Array.isArray(checks)
  ) {
    throw new Error("SYSTEM_PREFLIGHT_INVALID");
  }

  const parsedChecks = checks.map((check: unknown) => {
    if (!check || typeof check !== "object") {
      throw new Error("SYSTEM_PREFLIGHT_INVALID");
    }
    const key = Reflect.get(check, "key");
    const checkStatus = Reflect.get(check, "status");
    const messageCode = Reflect.get(check, "messageCode");
    if (
      typeof key !== "string" ||
      !systemCheckKeys.has(key as SystemCheckKey) ||
      (checkStatus !== "ready" && checkStatus !== "attention") ||
      (messageCode !== undefined && typeof messageCode !== "string")
    ) {
      throw new Error("SYSTEM_PREFLIGHT_INVALID");
    }
    return {
      key: key as SystemCheckKey,
      status: checkStatus,
      ...(messageCode === undefined ? {} : { messageCode }),
    };
  });

  if (
    parsedChecks.length !== systemCheckKeys.size ||
    new Set(parsedChecks.map((check) => check.key)).size !==
      systemCheckKeys.size ||
    (status === "ready" &&
      parsedChecks.some((check) => check.status !== "ready"))
  ) {
    throw new Error("SYSTEM_PREFLIGHT_INVALID");
  }

  return { status, checks: parsedChecks };
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
  const reportedRegistrationRequired = Reflect.get(
    value,
    "registrationRequired",
  );
  if (typeof setupRequired !== "boolean") {
    throw new Error("SETUP_STATUS_INVALID");
  }
  // Older Core APIs only report setupRequired during a staggered local upgrade.
  const phase = reportedPhase ?? (setupRequired ? "new" : "ready");
  if (
    (phase !== "new" && phase !== "in_progress" && phase !== "ready") ||
    (phase === "ready") !== !setupRequired ||
    (reportedRegistrationRequired !== undefined &&
      typeof reportedRegistrationRequired !== "boolean")
  ) {
    throw new Error("SETUP_STATUS_INVALID");
  }
  // Older APIs cannot distinguish first registration from unfinished setup.
  const registrationRequired = reportedRegistrationRequired ?? phase === "new";
  if (registrationRequired && phase !== "new") {
    throw new Error("SETUP_STATUS_INVALID");
  }
  return { setupRequired, phase, registrationRequired };
}

export async function emailDeliveryStatus(
  signal?: AbortSignal,
): Promise<EmailDeliveryStatus> {
  return parseEmailDeliveryStatus(
    await request<unknown>("/api/v1/setup/email/status", undefined, { signal }),
  );
}

export async function testEmailDelivery(
  settings: EmailDeliverySettings,
  setupSecret: string,
  idempotencyKey: string,
): Promise<EmailDeliveryTestResult> {
  const value = await request<unknown>("/api/v1/setup/email/test", undefined, {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
      "X-Bubllio-Setup-Secret": setupSecret,
    },
    body: JSON.stringify(settings),
  });
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
  }
  const status = Reflect.get(value, "status");
  const maskedRecipient = Reflect.get(value, "maskedRecipient");
  if (
    !hasOnlyKeys(value, ["status", "maskedRecipient"]) ||
    status !== "awaiting_confirmation" ||
    typeof maskedRecipient !== "string" ||
    !maskedRecipient
  ) {
    throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
  }
  return { status, maskedRecipient };
}

export async function confirmEmailDelivery(
  confirmationCode: string,
  setupSecret: string,
  idempotencyKey: string,
): Promise<Extract<EmailDeliveryStatus, { status: "ready" }>> {
  const status = parseEmailDeliveryStatus(
    await request<unknown>("/api/v1/setup/email/confirm", undefined, {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
        "X-Bubllio-Setup-Secret": setupSecret,
      },
      body: JSON.stringify({ code: confirmationCode }),
    }),
  );
  if (status.status !== "ready") {
    throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
  }
  return status;
}

export async function currentSetup(
  keycloak: Keycloak,
  signal?: AbortSignal,
): Promise<CurrentSetup> {
  return request("/api/v1/setup/current", keycloak, { signal });
}

function parseEmailDeliveryStatus(value: unknown): EmailDeliveryStatus {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
  }
  const status = Reflect.get(value, "status");
  if (status === "required") {
    if (!hasOnlyKeys(value, ["status"]))
      throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
    return { status };
  }
  if (status === "awaiting_confirmation") {
    if (!hasOnlyKeys(value, ["status"]))
      throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
    return { status };
  }
  if (status === "ready") {
    if (!hasOnlyKeys(value, ["status", "testedAt", "configuredAt"]))
      throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
    const testedAt = Reflect.get(value, "testedAt");
    const configuredAt = Reflect.get(value, "configuredAt");
    if (
      (testedAt !== undefined &&
        (typeof testedAt !== "string" ||
          !Number.isFinite(Date.parse(testedAt)))) ||
      (configuredAt !== undefined &&
        (typeof configuredAt !== "string" ||
          !Number.isFinite(Date.parse(configuredAt))))
    ) {
      throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
    }
    return {
      status,
      ...(testedAt === undefined ? {} : { testedAt }),
      ...(configuredAt === undefined ? {} : { configuredAt }),
    };
  }
  if (status === "attention") {
    if (
      !hasOnlyKeys(value, ["status", "safeErrorCode", "confirmationRetryable"])
    )
      throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
    const safeErrorCode = Reflect.get(value, "safeErrorCode");
    const confirmationRetryable = Reflect.get(value, "confirmationRetryable");
    if (
      typeof safeErrorCode !== "string" ||
      typeof confirmationRetryable !== "boolean" ||
      !emailDeliverySafeErrorCodes.has(
        safeErrorCode as EmailDeliverySafeErrorCode,
      )
    ) {
      throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
    }
    return {
      status,
      safeErrorCode: safeErrorCode as EmailDeliverySafeErrorCode,
      confirmationRetryable,
    };
  }
  throw new Error("EMAIL_DELIVERY_STATUS_INVALID");
}

function hasOnlyKeys(value: object, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
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
