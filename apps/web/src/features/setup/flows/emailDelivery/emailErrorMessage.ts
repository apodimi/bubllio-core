import type { SetupCopy } from "../../../../../locales";
import { EmailDeliverySafeErrorCode } from "../../schemas/setupApi.schema";

export function errorCodeFrom(error: unknown): string {
  return error instanceof Error ? error.message : "EMAIL_UNAVAILABLE";
}

export function emailErrorMessage(code: string, copy: SetupCopy): string {
  switch (code) {
    case EmailDeliverySafeErrorCode.Unavailable:
      return copy.emailConnectionFailed;
    case EmailDeliverySafeErrorCode.AuthenticationFailed:
      return copy.emailAuthenticationFailed;
    case EmailDeliverySafeErrorCode.TlsFailed:
      return copy.emailTlsFailed;
    case EmailDeliverySafeErrorCode.Rejected:
      return copy.emailSenderRejected;
    case EmailDeliverySafeErrorCode.ConfirmationInvalid:
    case EmailDeliverySafeErrorCode.ConfirmationExpired:
      return copy.emailCodeInvalid;
    case EmailDeliverySafeErrorCode.IdentityActivationFailed:
      return copy.emailIdentityActivationFailed;
    case "EMAIL_INVALID_REQUEST":
      return copy.invalid;
    default:
      return copy.emailUnavailable;
  }
}
