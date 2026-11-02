import { parseResponse, requestCore } from "@/lib";
import {
  EmailDeliveryTestResultSchema,
  type EmailDeliverySettings,
  type EmailDeliveryTestResult,
} from "../schemas/setupApi.schema";

export async function testEmailDelivery(
  settings: EmailDeliverySettings,
  setupSecret: string,
  idempotencyKey: string,
): Promise<EmailDeliveryTestResult> {
  const response = await requestCore("/api/v1/setup/email/test", false, {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
      "X-Bubllio-Setup-Secret": setupSecret,
    },
    data: settings,
  });

  return parseResponse(
    EmailDeliveryTestResultSchema,
    response,
    "EMAIL_DELIVERY_STATUS_INVALID",
  );
}
