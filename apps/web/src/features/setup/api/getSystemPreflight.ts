import { requestCore, parseResponse } from "@/lib";
import {
  SystemPreflightSchema,
  type SystemPreflight,
} from "../schemas/setupApi.schema";

export async function getSystemPreflight(
  signal?: AbortSignal,
): Promise<SystemPreflight> {
  const response = await requestCore("/api/v1/system/preflight", false, {
    signal,
  });

  return parseResponse(
    SystemPreflightSchema,
    response,
    "SYSTEM_PREFLIGHT_INVALID",
  );
}
