import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";

import type {
  DashboardNavigationContext,
  DashboardNavigationGroup,
} from "@/layouts";
import { paths } from "@/routes";
import type { WorkspaceOrganization } from "../schemas/workspace.schema";

export function useWorkspaceNavigation(
  organization?: WorkspaceOrganization,
  organizations: WorkspaceOrganization[] = [],
) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
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

  const context: DashboardNavigationContext | undefined = organization
    ? {
        id: organization.id,
        name: organization.displayName,
        label: t("workspace.chooseOrganization"),
        options: organizations.map(({ id, displayName }) => ({
          id,
          name: displayName,
        })),
        onChange: (id) => {
          const selected = organizations.find((item) => item.id === id);
          const peoplePage = paths.people.replace(
            ":organizationId",
            encodeURIComponent(organization.id),
          );
          if (
            pathname === peoplePage &&
            (selected?.role === "OWNER" || selected?.role === "ADMIN")
          ) {
            void navigate(
              paths.people.replace(":organizationId", encodeURIComponent(id)),
            );

            return;
          }
          void navigate(`${paths.home}?organization=${encodeURIComponent(id)}`);
        },
      }
    : undefined;

  return { context, groups };
}
