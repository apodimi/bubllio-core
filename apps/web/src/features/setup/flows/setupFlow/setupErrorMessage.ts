import type { SetupCopy } from "../../../../../locales";

export function setupErrorMessage(error: unknown, copy: SetupCopy): string {
  const code = error instanceof Error ? error.message : "";

  if (code === "SESSION_EXPIRED" || code === "UNAUTHENTICATED") {
    return copy.sessionExpired;
  }

  if (code === "SETUP_CLAIM_CONFLICT") {
    return copy.conflict;
  }

  if (code === "SETUP_INVALID_REQUEST") {
    return copy.invalid;
  }

  return copy.unavailable;
}
