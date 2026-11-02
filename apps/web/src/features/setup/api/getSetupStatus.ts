import { parseResponse, requestCore } from "@/lib";
import {
  SetupStatusSchema,
  SetupStatusWireSchema,
  type SetupStatus,
} from "../schemas/setupApi.schema";

export async function getSetupStatus(
  signal?: AbortSignal,
): Promise<SetupStatus> {
  const response = await requestCore("/api/v1/setup/status", false, {
    signal,
  });
  const wire = parseResponse(
    SetupStatusWireSchema,
    response,
    "SETUP_STATUS_INVALID",
  );
  // Older Core APIs only report setupRequired during a staggered local upgrade.
  const phase = wire.phase ?? (wire.setupRequired ? "new" : "ready");
  // Older APIs cannot distinguish first registration from unfinished setup.
  const registrationRequired = wire.registrationRequired ?? phase === "new";

  return parseResponse(
    SetupStatusSchema,
    { setupRequired: wire.setupRequired, phase, registrationRequired },
    "SETUP_STATUS_INVALID",
  );
}
