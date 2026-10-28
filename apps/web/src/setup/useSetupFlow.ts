import {
  useCallback,
  useEffect,
  useReducer,
  useState,
  type FormEvent,
} from "react";
import type Keycloak from "keycloak-js";

import { setupCopy, type SetupLocale } from "../setup-copy";
import {
  useClaimSetup,
  useCreateFirstOrganization,
  useCurrentSetup,
  useEmailDeliveryStatus,
  useRetrySetupOperation,
  useSetupOperation,
  useSetupStatus,
  useSystemPreflight,
} from "../setup-queries";
import {
  initialSetupFlowState,
  setupFlowReducer,
  type SetupStep,
} from "./setup-flow.reducer";

export function useSetupFlow(keycloak: Keycloak) {
  const [locale, setLocale] = useState<SetupLocale>(() =>
    navigator.language.startsWith("el") ? "el" : "en",
  );
  const [state, dispatch] = useReducer(setupFlowReducer, initialSetupFlowState);
  const [claimKey] = useState(() => crypto.randomUUID());
  const [organizationKey] = useState(() => crypto.randomUUID());
  const copy = setupCopy[locale];
  const preflightQuery = useSystemPreflight();
  const emailDeliveryQuery = useEmailDeliveryStatus();
  const statusQuery = useSetupStatus();
  const currentQuery = useCurrentSetup(keycloak);
  const operationQuery = useSetupOperation(keycloak, state.operation?.id);
  const claimMutation = useClaimSetup(keycloak);
  const organizationMutation = useCreateFirstOrganization(keycloak);
  const retryMutation = useRetrySetupOperation(keycloak);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (
      state.step === "preflight" &&
      preflightQuery.data?.status === "ready" &&
      (emailDeliveryQuery.data || emailDeliveryQuery.isError)
    ) {
      dispatch({
        type: "set-step",
        step: emailDeliveryQuery.data?.status === "ready" ? "loading" : "email",
      });
    }
  }, [
    emailDeliveryQuery.data,
    emailDeliveryQuery.isError,
    preflightQuery.data?.status,
    state.step,
  ]);

  useEffect(() => {
    if (state.step !== "loading") return;
    if (isAuthenticationError(currentQuery.error)) {
      dispatch({ type: "show-error", message: copy.sessionExpired });
      dispatch({ type: "set-step", step: "reauthenticate" });
      return;
    }
    if (statusQuery.isError || currentQuery.isError) {
      dispatch({ type: "show-error", message: copy.unavailable });
      dispatch({ type: "set-step", step: "unavailable" });
      return;
    }
    const status = statusQuery.data;
    if (!status) return;
    if (!keycloak.authenticated) {
      dispatch({
        type: "set-step",
        step:
          status.phase === "new"
            ? "intro"
            : status.phase === "in_progress"
              ? "resume"
              : "closed",
      });
      return;
    }
    const current = currentQuery.data;
    if (!current) return;
    if (current.state === "operation") {
      dispatch({
        type: "set-operation",
        operation: current.operation,
        step: current.operation.status === "succeeded" ? "done" : "progress",
      });
    } else if (!status.setupRequired) {
      dispatch({ type: "set-step", step: "closed" });
    } else {
      dispatch({
        type: "set-step",
        step:
          current.state === "claimed"
            ? "organization"
            : status.phase === "in_progress"
              ? "taken"
              : "secret",
      });
    }
  }, [
    state.step,
    statusQuery.data,
    statusQuery.isError,
    currentQuery.data,
    currentQuery.isError,
    keycloak.authenticated,
    copy.unavailable,
  ]);

  useEffect(() => {
    const updated = operationQuery.data;
    if (
      state.step !== "progress" ||
      !updated ||
      updated.id !== state.operation?.id
    )
      return;
    dispatch({
      type: "set-operation",
      operation: updated,
      step: updated.status === "succeeded" ? "done" : "progress",
    });
  }, [operationQuery.data, state.operation?.id, state.step]);

  useEffect(() => {
    if (state.step === "progress" && operationQuery.isError) {
      dispatch({ type: "show-error", message: copy.unavailable });
    }
  }, [state.step, operationQuery.isError, copy.unavailable]);

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "start-action" });
    try {
      await claimMutation.mutateAsync({ secret: state.secret, key: claimKey });
      dispatch({ type: "clear-secret" });
      dispatch({ type: "set-step", step: "organization" });
    } catch (cause) {
      dispatch({ type: "clear-secret" });
      dispatch({ type: "show-error", message: messageFor(cause, copy) });
    } finally {
      dispatch({ type: "finish-action" });
    }
  }

  async function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "start-action" });
    try {
      const result = await organizationMutation.mutateAsync({
        displayName: state.organizationName,
        key: organizationKey,
      });
      dispatch({
        type: "set-operation",
        operation: result,
        step: result.status === "succeeded" ? "done" : "progress",
      });
    } catch (cause) {
      dispatch({ type: "show-error", message: messageFor(cause, copy) });
    } finally {
      dispatch({ type: "finish-action" });
    }
  }

  async function submitRetry() {
    if (!state.operation) return;
    dispatch({ type: "start-action" });
    try {
      const result = await retryMutation.mutateAsync({
        id: state.operation.id,
      });
      dispatch({
        type: "set-operation",
        operation: result,
        step: result.status === "succeeded" ? "done" : "progress",
      });
      if (result.status === "awaiting_owner") {
        dispatch({
          type: "show-retry-feedback",
          message: copy.invitationStillPending,
        });
      } else if (result.status === "needs_attention") {
        dispatch({
          type: "show-retry-feedback",
          message: copy.retryStillNeedsAttention,
        });
      }
    } catch (cause) {
      dispatch({ type: "show-error", message: messageFor(cause, copy) });
    } finally {
      dispatch({ type: "finish-action" });
    }
  }

  const continueAfterEmail = useCallback(
    () => dispatch({ type: "set-step", step: "loading" }),
    [],
  );

  return {
    state,
    locale,
    setLocale,
    copy,
    preflightQuery,
    emailDeliveryQuery,
    continueAfterEmail,
    reauthenticate: () =>
      void keycloak.login({
        redirectUri: window.location.origin,
        prompt: "login",
      }),
    setStep: (step: SetupStep) => dispatch({ type: "set-step", step }),
    setSecret: (value: string) => dispatch({ type: "set-secret", value }),
    setOrganizationName: (value: string) =>
      dispatch({ type: "set-organization-name", value }),
    submitClaim,
    submitOrganization,
    submitRetry,
  };
}

function isAuthenticationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message === "UNAUTHENTICATED" || error.message === "SESSION_EXPIRED"
  );
}

function messageFor(
  error: unknown,
  copy: (typeof setupCopy)[SetupLocale],
): string {
  const code = error instanceof Error ? error.message : "";
  if (code === "SESSION_EXPIRED" || code === "UNAUTHENTICATED")
    return copy.sessionExpired;
  if (code === "SETUP_CLAIM_CONFLICT") return copy.conflict;
  if (code === "SETUP_INVALID_REQUEST") return copy.invalid;
  return copy.unavailable;
}
