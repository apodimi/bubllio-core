import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { LoadingStatus, RetryAlert } from "@/components";
import { useAuth } from "@/features/auth";
import { useWorkspaceOrganizations } from "@/features/workspace";
import { DashboardLayout } from "@/layouts";
import { paths } from "@/routes";
import { InviteMemberForm } from "../components/InviteMemberForm";
import { MembersList } from "../components/MembersList";
import { OrganizationInvitations } from "../components/OrganizationInvitations";
import { usePeople } from "../hooks/usePeople";

export function PeoplePage() {
  const { organizationId = "" } = useParams();
  const { subject } = useAuth();
  const { t } = useTranslation("translation", { keyPrefix: "people" });
  const {
    data: organizations,
    isPending: organizationsPending,
    error: organizationsError,
    refetch: refetchOrganizations,
  } = useWorkspaceOrganizations(subject);
  const organization = organizations?.find(({ id }) => id === organizationId);
  const allowed =
    organization?.role === "OWNER" || organization?.role === "ADMIN";
  const { members, invitations, catalog } = usePeople(
    subject,
    organizationId,
    allowed,
  );

  const loading =
    organizationsPending ||
    (allowed &&
      (members.isPending || invitations.isPending || catalog.isPending));
  const failed =
    organizationsError || members.error || invitations.error || catalog.error;

  function retry() {
    if (organizationsError) {
      void refetchOrganizations();

      return;
    }
    void Promise.all([
      members.refetch(),
      invitations.refetch(),
      catalog.refetch(),
    ]);
  }

  return (
    <DashboardLayout sectionLabel={t("title")} signOutLabel={t("signOut")}>
      <Button
        component={Link}
        to={`${paths.home}?organization=${encodeURIComponent(organizationId)}`}
        color="inherit"
        sx={{ mb: 2 }}
      >
        {t("back")}
      </Button>
      <Typography variant="h1" component="h1">
        {t("title")}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
        {organization
          ? t("subtitle", { organization: organization.displayName })
          : t("subtitleGeneric")}
      </Typography>

      {loading ? (
        <LoadingStatus label={t("loading")} />
      ) : failed ? (
        <RetryAlert
          message={t("loadFailed")}
          retryLabel={t("retry")}
          onRetry={retry}
        />
      ) : !allowed ? (
        <Alert severity="warning">{t("unavailable")}</Alert>
      ) : (
        <Stack spacing={4}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <InviteMemberForm
              organizationId={organizationId}
              subject={subject}
              apps={catalog.data ?? []}
            />
          </Paper>
          <MembersList
            key={organizationId}
            members={members.data ?? []}
            apps={catalog.data ?? []}
            organizationId={organizationId}
            actorRole={organization?.role === "OWNER" ? "OWNER" : "ADMIN"}
            subject={subject}
          />
          <OrganizationInvitations
            key={organizationId}
            invitations={invitations.data ?? []}
            organizationId={organizationId}
            subject={subject}
          />
        </Stack>
      )}
    </DashboardLayout>
  );
}
