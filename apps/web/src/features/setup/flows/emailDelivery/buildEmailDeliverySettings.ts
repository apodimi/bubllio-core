import type { EmailSettingsValues } from "../../schemas/emailDeliveryForm.schema";
import type { EmailDeliverySettings } from "../../schemas/setupApi.schema";

export function buildEmailDeliverySettings(
  values: EmailSettingsValues,
): EmailDeliverySettings {
  return {
    senderName: values.senderName.trim(),
    senderEmail: values.senderEmail.trim(),
    ...(values.replyToEmail.trim()
      ? { replyToEmail: values.replyToEmail.trim() }
      : {}),
    host: values.host.trim(),
    port: Number(values.port),
    security: values.security,
    authentication: values.authentication,
    ...(values.authentication
      ? { username: values.username.trim(), password: values.password }
      : {}),
    testRecipient: values.testRecipient.trim(),
  };
}
