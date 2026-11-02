import { parseResponse, requestCore } from "@/lib";
import { ClaimSetupResultSchema } from "../schemas/setupApi.schema";

export async function claimSetup(secret: string, key: string): Promise<void> {
  const response = await requestCore("/api/v1/setup/claim", true, {
    method: "POST",
    headers: { "Idempotency-Key": key, "X-Bubllio-Setup-Secret": secret },
    data: {},
  });
  parseResponse(ClaimSetupResultSchema, response, "SETUP_CLAIM_INVALID");
}
