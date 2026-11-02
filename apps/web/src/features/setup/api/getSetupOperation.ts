import { parseResponse, requestCore } from "@/lib";
import {
  SetupOperationSchema,
  type SetupOperation,
} from "../schemas/setupApi.schema";

export async function getSetupOperation(
  id: string,
  signal?: AbortSignal,
): Promise<SetupOperation> {
  const response = await requestCore(
    `/api/v1/setup/operations/${encodeURIComponent(id)}`,
    true,
    { signal },
  );

  return parseResponse(
    SetupOperationSchema,
    response,
    "SETUP_OPERATION_INVALID",
  );
}
