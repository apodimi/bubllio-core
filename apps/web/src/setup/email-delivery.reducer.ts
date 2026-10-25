import type { EmailDeliverySecurity } from "../setup-api";

export interface EmailDeliveryFormState {
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  host: string;
  port: string;
  security: EmailDeliverySecurity;
  authentication: boolean;
  username: string;
  password: string;
  testRecipient: string;
  setupSecret: string;
  confirmationCode: string;
  advanced: boolean;
  editing: boolean;
  errorCode: string;
}

type TextFieldName = Exclude<
  keyof EmailDeliveryFormState,
  "authentication" | "advanced" | "editing"
>;

export type EmailDeliveryFormAction =
  | { type: "set-field"; field: TextFieldName; value: string }
  | { type: "set-authentication"; value: boolean }
  | { type: "set-advanced"; value: boolean }
  | { type: "set-editing"; value: boolean }
  | { type: "set-error"; value: string }
  | { type: "clear-secrets" };

export const initialEmailDeliveryFormState: EmailDeliveryFormState = {
  senderName: "Bubllio",
  senderEmail: "",
  replyToEmail: "",
  host: "",
  port: "587",
  security: "starttls",
  authentication: true,
  username: "",
  password: "",
  testRecipient: "",
  setupSecret: "",
  confirmationCode: "",
  advanced: false,
  editing: false,
  errorCode: "",
};

export function emailDeliveryFormReducer(
  state: EmailDeliveryFormState,
  action: EmailDeliveryFormAction,
): EmailDeliveryFormState {
  switch (action.type) {
    case "set-field":
      return { ...state, [action.field]: action.value, errorCode: "" };
    case "set-authentication":
      return {
        ...state,
        authentication: action.value,
        password: action.value ? state.password : "",
        username: action.value ? state.username : "",
        errorCode: "",
      };
    case "set-advanced":
      return { ...state, advanced: action.value };
    case "set-editing":
      return { ...state, editing: action.value, errorCode: "" };
    case "set-error":
      return { ...state, errorCode: action.value };
    case "clear-secrets":
      return {
        ...state,
        password: "",
        setupSecret: "",
        confirmationCode: "",
      };
  }
}
