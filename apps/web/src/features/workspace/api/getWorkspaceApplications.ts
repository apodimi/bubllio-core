import { parseResponse, requestCore } from "@/lib";
import {
  WorkspaceApplicationsSchema,
  type WorkspaceApplication,
} from "../schemas/workspace.schema";

export async function getWorkspaceApplications(
  organizationId: string,
  signal?: AbortSignal,
): Promise<WorkspaceApplication[]> {
  const response = await requestCore(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/applications`,
    true,
    { signal },
  );

  return parseResponse(
    WorkspaceApplicationsSchema,
    response,
    "CORE_RESPONSE_INVALID",
  );
}
