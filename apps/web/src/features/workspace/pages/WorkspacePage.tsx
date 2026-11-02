import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  NativeSelect,
  Typography,
} from "@mui/material";

import { LoadingStatus, RetryAlert } from "@/components";
import { DashboardLayout } from "@/layouts";
import { useAuth } from "@/features/auth";
import { CoreHttpError } from "@/lib";
import { WorkspaceApplicationCard } from "../components/WorkspaceApplicationCard";
import { useWorkspaceApplications, useWorkspaceOrganizations } from "../hooks";

export function WorkspacePage() {
  const auth = useAuth();
  const { t } = useTranslation("translation", { keyPrefix: "workspace" });
  const [selectedOrganizationId, setOrganizationId] = useState("");
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

  return (
    <DashboardLayout sectionLabel={t("workspace")} signOutLabel={t("signOut")}>
      <Typography variant="h1" component="h1">
        {t("applications")}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {t("subtitle")}
      </Typography>
      {organizations && organizations.length > 0 && (
        <FormControl
          size="small"
          sx={{ mt: 4, minWidth: { xs: "100%", sm: 320 } }}
        >
          <InputLabel id="organization-label">
            {t("chooseOrganization")}
          </InputLabel>
          <NativeSelect
            id="organization-select"
            value={organizationId}
            inputProps={{ "aria-labelledby": "organization-label" }}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.displayName}
              </option>
            ))}
          </NativeSelect>
        </FormControl>
      )}
      <Box sx={{ mt: 4 }}>
        {error ? (
          <RetryAlert
            message={t(sessionExpired ? "sessionExpired" : "error")}
            retryLabel={t("retry")}
            onRetry={() =>
              void (organizationsFailed
                ? refetchOrganizations()
                : refetchApplications())
            }
            smallAction
          />
        ) : loading ? (
          <LoadingStatus label={t("loading")} />
        ) : organizations?.length === 0 ? (
          <Alert severity="info">
            <Typography variant="h6">{t("emptyOrganizations")}</Typography>
            <Typography variant="body2">
              {t("emptyOrganizationsHelp")}
            </Typography>
          </Alert>
        ) : applications?.length === 0 ? (
          <Alert severity="info">{t("emptyApps")}</Alert>
        ) : (
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
        )}
      </Box>
    </DashboardLayout>
  );
}
