import { parseResponse, requestCore } from "@/lib";
import {
  WorkspaceOrganizationsSchema,
  type WorkspaceOrganization,
} from "../schemas/workspace.schema";

export async function getWorkspaceOrganizations(
  signal?: AbortSignal,
): Promise<WorkspaceOrganization[]> {
  const response = await requestCore("/api/v1/me/organizations", true, {
    signal,
  });

  return parseResponse(
    WorkspaceOrganizationsSchema,
    response,
    "CORE_RESPONSE_INVALID",
  );
}
