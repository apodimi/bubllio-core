import { useQuery } from "@tanstack/react-query";
import type Keycloak from "keycloak-js";

import {
  getWorkspaceApplications,
  getWorkspaceOrganizations,
} from "./core-api";

export const workspaceKeys = {
  organizations: (subject: string | undefined) =>
    ["workspace", subject, "organizations"] as const,
  applications: (subject: string | undefined, organizationId: string) =>
    ["workspace", subject, organizationId, "applications"] as const,
};

export function useWorkspaceOrganizations(keycloak: Keycloak) {
  return useQuery({
    queryKey: workspaceKeys.organizations(keycloak.subject),
    queryFn: ({ signal }) => getWorkspaceOrganizations(keycloak, signal),
  });
}

export function useWorkspaceApplications(
  keycloak: Keycloak,
  organizationId: string,
) {
  return useQuery({
    queryKey: workspaceKeys.applications(keycloak.subject, organizationId),
    queryFn: ({ signal }) =>
      getWorkspaceApplications(keycloak, organizationId, signal),
    enabled: Boolean(organizationId),
  });
}
