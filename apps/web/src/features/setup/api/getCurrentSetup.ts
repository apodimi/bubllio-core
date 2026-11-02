import { parseResponse, requestCore } from "@/lib";
import {
  CurrentSetupSchema,
  type CurrentSetup,
} from "../schemas/setupApi.schema";

export async function getCurrentSetup(
  signal?: AbortSignal,
): Promise<CurrentSetup> {
  const response = await requestCore("/api/v1/setup/current", true, {
    signal,
  });

  return parseResponse(CurrentSetupSchema, response, "CURRENT_SETUP_INVALID");
}
