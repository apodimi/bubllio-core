import { parseResponse, requestCore } from "@/lib";
import {
  EmailDeliveryReadyStatusSchema,
  type EmailDeliveryStatus,
} from "../schemas/setupApi.schema";

export async function confirmEmailDelivery(
  confirmationCode: string,
  setupSecret: string,
  idempotencyKey: string,
): Promise<Extract<EmailDeliveryStatus, { status: "ready" }>> {
  const response = await requestCore("/api/v1/setup/email/confirm", false, {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
      "X-Bubllio-Setup-Secret": setupSecret,
    },
    data: { code: confirmationCode },
  });

  return parseResponse(
    EmailDeliveryReadyStatusSchema,
    response,
    "EMAIL_DELIVERY_STATUS_INVALID",
  );
}
