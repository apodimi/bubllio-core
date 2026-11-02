import { parseResponse, requestCore } from "@/lib";
import {
  SetupOperationSchema,
  type SetupOperation,
} from "../schemas/setupApi.schema";

export async function retrySetupOperation(id: string): Promise<SetupOperation> {
  const response = await requestCore(
    `/api/v1/setup/operations/${encodeURIComponent(id)}/retry`,
    true,
    {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      data: {},
    },
  );

  return parseResponse(
    SetupOperationSchema,
    response,
    "SETUP_OPERATION_INVALID",
  );
}
