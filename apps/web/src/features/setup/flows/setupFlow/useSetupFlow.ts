import { useReducer, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/features/auth";

import type { SetupCopy } from "../../../../../locales";
import { resolveSetupStep } from "./resolveSetupStep";
import { setupErrorMessage } from "./setupErrorMessage";
import { initialSetupFlowState, setupFlowReducer } from "./setupFlow.reducer";
import { useEmailDeliveryStatus } from "../../hooks/useEmailDeliveryQueries";
import {
  useClaimSetup,
  useCreateFirstOrganization,
  useCurrentSetup,
  useRetrySetupOperation,
  useSetupOperation,
  useSetupStatus,
  useSystemPreflight,
} from "../../hooks/useSetupQueries";

export function useSetupFlow() {
  const auth = useAuth();
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(setupFlowReducer, initialSetupFlowState);
  const [claimKey] = useState(() => crypto.randomUUID());
  const [organizationKey] = useState(() => crypto.randomUUID());
  const copy: SetupCopy = t("setup", { returnObjects: true });

  const preflightQuery = useSystemPreflight();
  const { data: emailDeliveryStatus, isError: emailDeliveryFailed } =
    useEmailDeliveryStatus();
  const { data: setupStatus, isError: setupStatusFailed } = useSetupStatus();
  const {
    data: current,
    error: currentError,
    isError: currentFailed,
  } = useCurrentSetup(auth);

  const currentOperation =
    current?.state === "operation" ? current.operation : undefined;
  const operationId = state.operationId ?? currentOperation?.id;

  const { data: operationData, isError: operationFailed } = useSetupOperation(
    auth,
    operationId,
  );
  const operation =
    operationData ??
    (currentOperation?.id === operationId ? currentOperation : undefined);

  const { mutateAsync: claimSetup } = useClaimSetup(auth.subject);
  const { mutateAsync: createOrganization } = useCreateFirstOrganization(
    auth.subject,
  );
  const { mutateAsync: retryOperation } = useRetrySetupOperation(auth.subject);

  const step = resolveSetupStep({
    authenticated: auth.authenticated,
    current,
    currentError,
    currentFailed,
    emailDeliveryFailed,
    emailDeliveryStatus,
    operation,
    preflightReady: preflightQuery.data?.status === "ready",
    setupStatus,
    setupStatusFailed,
    state,
  });

  let error = state.error;

  if (!error && step === "reauthenticate") {
    error = copy.sessionExpired;
  }

  if (
    !error &&
    (step === "unavailable" || (step === "progress" && operationFailed))
  ) {
    error = copy.unavailable;
  }

  const viewState = { ...state, step, error, operation };

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "start-action" });

    try {
      await claimSetup({ secret: state.secret, key: claimKey });
      dispatch({ type: "clear-secret" });
      dispatch({ type: "set-step", step: "organization" });
    } catch (cause) {
      dispatch({ type: "clear-secret" });
      dispatch({ type: "show-error", message: setupErrorMessage(cause, copy) });
    } finally {
      dispatch({ type: "finish-action" });
    }
  }

  async function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "start-action" });

    try {
      const result = await createOrganization({
        displayName: state.organizationName,
        key: organizationKey,
      });
      dispatch({ type: "set-operation-id", operationId: result.id });
    } catch (cause) {
      dispatch({ type: "show-error", message: setupErrorMessage(cause, copy) });
    } finally {
      dispatch({ type: "finish-action" });
    }
  }

  async function submitRetry() {
    if (!operation) {
      return;
    }

    dispatch({ type: "start-action" });

    try {
      const result = await retryOperation({
        id: operation.id,
      });
      dispatch({ type: "set-operation-id", operationId: result.id });
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
      dispatch({ type: "show-error", message: setupErrorMessage(cause, copy) });
    } finally {
      dispatch({ type: "finish-action" });
    }
  }

  return {
    state: viewState,
    copy,
    preflightQuery,
    reauthenticate: () => void auth.reauthenticate(),
    setSecret: (value: string) => dispatch({ type: "set-secret", value }),
    setOrganizationName: (value: string) =>
      dispatch({ type: "set-organization-name", value }),
    submitClaim,
    submitOrganization,
    submitRetry,
  };
}
