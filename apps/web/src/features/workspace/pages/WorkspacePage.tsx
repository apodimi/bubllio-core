import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Alert, Box, Typography } from "@mui/material";

import { LoadingStatus, RetryAlert } from "@/components";
import { DashboardLayout } from "@/layouts";
import { useAuth } from "@/features/auth";
import { CoreHttpError } from "@/lib";
import { paths } from "@/routes";
import { PendingInvitations } from "@/features/people";
import { WorkspaceApplicationCard } from "../components/WorkspaceApplicationCard";
import { WorkspaceEmptyApplications } from "../components/WorkspaceEmptyApplications";
import { useWorkspaceApplications, useWorkspaceOrganizations } from "../hooks";
import { useWorkspaceNavigation } from "../hooks/useWorkspaceNavigation";

export function WorkspacePage() {
  const auth = useAuth();
  const { t } = useTranslation("translation", { keyPrefix: "workspace" });
  const [searchParams] = useSearchParams();
  const selectedOrganizationId = searchParams.get("organization") ?? "";
  const {
    data: organizations,
    error: organizationsError,
    isError: organizationsFailed,
    isPending: organizationsPending,
    refetch: refetchOrganizations,
  } = useWorkspaceOrganizations(auth.subject);

  const organizationId =
    organizations?.find(({ id }) => id === selectedOrganizationId)?.id ??
    organizations?.[0]?.id ??
    "";
  const selectedOrganization = organizations?.find(
    (organization) => organization.id === organizationId,
  );
  const navigation = useWorkspaceNavigation(
    selectedOrganization,
    organizations,
  );
  const {
    data: applications,
    error: applicationsError,
    isPending: applicationsPending,
    refetch: refetchApplications,
  } = useWorkspaceApplications(auth.subject, organizationId);

  const error = organizationsError ?? applicationsError;
  const loading =
    organizationsPending || (Boolean(organizationId) && applicationsPending);
  const sessionExpired =
    (error instanceof CoreHttpError && error.status === 401) ||
    (error instanceof Error && error.message === "SESSION_EXPIRED");
  const canManageAccess =
    selectedOrganization?.role === "OWNER" ||
    selectedOrganization?.role === "ADMIN";
  const manageAccessUrl = canManageAccess
    ? paths.people.replace(
        ":organizationId",
        encodeURIComponent(organizationId),
      )
    : undefined;

  function retry() {
    if (organizationsFailed) {
      void refetchOrganizations();

      return;
    }
    void refetchApplications();
  }

  let applicationsContent: React.ReactNode;
  if (error) {
    applicationsContent = (
      <RetryAlert
        message={t(sessionExpired ? "sessionExpired" : "error")}
        retryLabel={t("retry")}
        onRetry={retry}
        smallAction
      />
    );
  } else if (loading) {
    applicationsContent = <LoadingStatus label={t("loading")} />;
  } else if (organizations?.length === 0) {
    applicationsContent = (
      <Alert severity="info">
        <Typography variant="h6">{t("emptyOrganizations")}</Typography>
        <Typography variant="body2">{t("emptyOrganizationsHelp")}</Typography>
      </Alert>
    );
  } else if (applications?.length === 0) {
    applicationsContent = (
      <WorkspaceEmptyApplications manageAccessUrl={manageAccessUrl} />
    );
  } else {
    applicationsContent = (
      <>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {t("subtitle")}
        </Typography>
        <Box
          component="ul"
          aria-label={t("applications")}
          sx={{
            listStyle: "none",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: 3,
            p: 0,
            m: 0,
          }}
        >
          {applications?.map((application) => (
            <WorkspaceApplicationCard
              key={application.key}
              application={application}
              organizationId={organizationId}
            />
          ))}
        </Box>
      </>
    );
  }

  return (
    <DashboardLayout
      navigation={navigation}
      sectionLabel={t("applications")}
      signOutLabel={t("signOut")}
    >
      <Typography variant="h1" component="h1">
        {t("applications")}
      </Typography>
      <Box sx={{ mt: 4 }}>{applicationsContent}</Box>
      <PendingInvitations />
    </DashboardLayout>
  );
}
