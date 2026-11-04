import { useTranslation } from "react-i18next";

import type { DashboardNavigationGroup } from "@/layouts";
import { paths } from "@/routes";
import type { WorkspaceOrganization } from "../schemas/workspace.schema";

export function useWorkspaceNavigation(organization?: WorkspaceOrganization) {
  const { t } = useTranslation();
  const organizationQuery = organization
    ? `?organization=${encodeURIComponent(organization.id)}`
    : "";
  const groups: DashboardNavigationGroup[] = [
    {
      label: t("navigation.workspace"),
      items: [
        {
          label: t("navigation.applications"),
          to: `${paths.home}${organizationQuery}`,
        },
      ],
    },
  ];

  if (organization?.role === "OWNER" || organization?.role === "ADMIN") {
    groups.push({
      label: t("navigation.organization"),
      items: [
        {
          label: t("workspace.peopleAccess"),
          to: paths.people.replace(
            ":organizationId",
            encodeURIComponent(organization.id),
          ),
        },
      ],
    });
  }

  return { contextName: organization?.displayName, groups };
}
