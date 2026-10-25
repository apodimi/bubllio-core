import type { SetupOperation } from "../setup-api";

export type SetupStep =
  | "preflight"
  | "email"
  | "loading"
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
  operation?: SetupOperation;
  error: string;
  busy: boolean;
}

export type SetupFlowAction =
  | { type: "set-step"; step: SetupStep }
  | { type: "set-secret"; value: string }
  | { type: "set-organization-name"; value: string }
  | { type: "start-action" }
  | { type: "finish-action" }
  | { type: "show-error"; message: string }
  | { type: "set-operation"; operation: SetupOperation; step?: SetupStep }
  | { type: "clear-secret" };

export const initialSetupFlowState: SetupFlowState = {
  step: "preflight",
  secret: "",
  organizationName: "",
  error: "",
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
      return { ...state, busy: true, error: "" };
    case "finish-action":
      return { ...state, busy: false };
    case "show-error":
      return { ...state, busy: false, error: action.message };
    case "set-operation":
      return {
        ...state,
        operation: action.operation,
        step: action.step ?? state.step,
        error: "",
      };
    case "clear-secret":
      return { ...state, secret: "" };
  }
}
