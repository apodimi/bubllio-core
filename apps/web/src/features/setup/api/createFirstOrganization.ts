import { parseResponse, requestCore } from "@/lib";
import {
  SetupOperationSchema,
  type SetupOperation,
} from "../schemas/setupApi.schema";

export async function createFirstOrganization(
  displayName: string,
  key: string,
): Promise<SetupOperation> {
  const response = await requestCore("/api/v1/setup/organization", true, {
    method: "POST",
    headers: { "Idempotency-Key": key },
    data: { displayName },
  });

  return parseResponse(
    SetupOperationSchema,
    response,
    "SETUP_OPERATION_INVALID",
  );
}
