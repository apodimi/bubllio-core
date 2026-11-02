import type {
  CurrentSetup,
  EmailDeliveryStatus,
  SetupOperation,
  SetupStatus,
} from "../../schemas/setupApi.schema";
import type { SetupFlowState, SetupStep } from "./setupFlow.reducer";

interface ResolveSetupStepInput {
  authenticated: boolean;
  current: CurrentSetup | undefined;
  currentError: unknown;
  currentFailed: boolean;
  emailDeliveryFailed: boolean;
  emailDeliveryStatus: EmailDeliveryStatus | undefined;
  operation: SetupOperation | undefined;
  preflightReady: boolean;
  setupStatus: SetupStatus | undefined;
  setupStatusFailed: boolean;
  state: SetupFlowState;
}

export function resolveSetupStep(input: ResolveSetupStepInput): SetupStep {
  const {
    authenticated,
    current,
    currentError,
    currentFailed,
    emailDeliveryFailed,
    emailDeliveryStatus,
    operation,
    preflightReady,
    setupStatus,
    setupStatusFailed,
    state,
  } = input;

  // Installation checks and email delivery gate the first account.
  if (state.step === "preflight") {
    if (!preflightReady || (!emailDeliveryStatus && !emailDeliveryFailed)) {
      return "preflight";
    }

    if (emailDeliveryStatus?.status !== "ready") {
      return "email";
    }
  }

  // Server and session failures override a step selected by a local action.
  if (isAuthenticationError(currentError)) {
    return "reauthenticate";
  }

  if (setupStatusFailed || currentFailed) {
    return "unavailable";
  }

  // Keep the local step while its mutation and query updates settle.
  if (
    !authenticated &&
    (state.step === "organization" || state.step === "progress")
  ) {
    return "reauthenticate";
  }

  if (state.step === "progress" && operation?.status === "succeeded") {
    return "done";
  }

  if (state.step !== "preflight" && state.step !== "loading") {
    return state.step;
  }

  // On first load, Core's setup state determines the next step.
  if (!setupStatus) {
    return "loading";
  }

  if (!authenticated) {
    switch (setupStatus.phase) {
      case "new":
        return "intro";
      case "in_progress":
        return "resume";
      case "ready":
        return "closed";
    }
  }

  if (!current) {
    return "loading";
  }

  if (current.state === "operation") {
    return operation?.status === "succeeded" ? "done" : "progress";
  }

  if (!setupStatus.setupRequired) {
    return "closed";
  }

  if (current.state === "claimed") {
    return "organization";
  }

  return setupStatus.phase === "in_progress" ? "taken" : "secret";
}

function isAuthenticationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message === "UNAUTHENTICATED" || error.message === "SESSION_EXPIRED"
  );
}
