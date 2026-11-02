import { useQuery } from "@tanstack/react-query";

import { getWorkspaceApplications, getWorkspaceOrganizations } from "../api";

export const workspaceKeys = {
  organizations: (subject: string | undefined) =>
    ["workspace", subject, "organizations"] as const,
  applications: (subject: string | undefined, organizationId: string) =>
    ["workspace", subject, organizationId, "applications"] as const,
};

export function useWorkspaceOrganizations(subject: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.organizations(subject),
    queryFn: ({ signal }) => getWorkspaceOrganizations(signal),
  });
}

export function useWorkspaceApplications(
  subject: string | undefined,
  organizationId: string,
) {
  return useQuery({
    queryKey: workspaceKeys.applications(subject, organizationId),
    queryFn: ({ signal }) => getWorkspaceApplications(organizationId, signal),
    enabled: Boolean(organizationId),
  });
}
