import { parseResponse, requestCore } from "@/lib";
import {
  EmailDeliveryStatusSchema,
  type EmailDeliveryStatus,
} from "../schemas/setupApi.schema";

export async function getEmailDeliveryStatus(
  signal?: AbortSignal,
): Promise<EmailDeliveryStatus> {
  const response = await requestCore("/api/v1/setup/email/status", false, {
    signal,
  });

  return parseResponse(
    EmailDeliveryStatusSchema,
    response,
    "EMAIL_DELIVERY_STATUS_INVALID",
  );
}
