export type SetupStep =
  | "preflight"
  | "email"
  | "loading"
  | "reauthenticate"
  | "unavailable"
  | "intro"
  | "resume"
  | "taken"
  | "secret"
  | "organization"
  | "progress"
  | "done"
  | "closed";

export interface SetupFlowState {
  step: SetupStep;
  secret: string;
  organizationName: string;
  operationId?: string;
  error: string;
  retryFeedback: string;
  busy: boolean;
}

export type SetupFlowAction =
  | { type: "set-step"; step: SetupStep }
  | { type: "set-secret"; value: string }
  | { type: "set-organization-name"; value: string }
  | { type: "start-action" }
  | { type: "finish-action" }
  | { type: "show-error"; message: string }
  | { type: "show-retry-feedback"; message: string }
  | { type: "set-operation-id"; operationId: string }
  | { type: "clear-secret" };

export const initialSetupFlowState: SetupFlowState = {
  step: "preflight",
  secret: "",
  organizationName: "",
  error: "",
  retryFeedback: "",
  busy: false,
};

export function setupFlowReducer(
  state: SetupFlowState,
  action: SetupFlowAction,
): SetupFlowState {
  switch (action.type) {
    case "set-step":
      return { ...state, step: action.step, error: "" };
    case "set-secret":
      return { ...state, secret: action.value };
    case "set-organization-name":
      return { ...state, organizationName: action.value };
    case "start-action":
      return { ...state, busy: true, error: "", retryFeedback: "" };
    case "finish-action":
      return { ...state, busy: false };
    case "show-error":
      return { ...state, busy: false, error: action.message };
    case "show-retry-feedback":
      return { ...state, retryFeedback: action.message };
    case "set-operation-id":
      return {
        ...state,
        operationId: action.operationId,
        step: "progress",
        error: "",
      };
    case "clear-secret":
      return { ...state, secret: "" };
  }
}
