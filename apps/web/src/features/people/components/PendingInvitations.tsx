import { useState } from "react";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/features/auth";
import { LoadingStatus, RetryAlert } from "@/components";
import { CoreHttpError } from "@/lib";
import { useAcceptInvitation, useMyInvitations } from "../hooks/usePeople";

export function PendingInvitations() {
  const { subject, reauthenticate } = useAuth();
  const { t } = useTranslation("translation", { keyPrefix: "people" });
  const {
    data: invitations,
    isPending,
    error,
    refetch,
  } = useMyInvitations(subject);
  const { mutateAsync, isPending: accepting } = useAcceptInvitation(subject);
  const [message, setMessage] = useState<
    "accepted" | "failed" | "needsRefresh" | "checkEmailLink" | ""
  >("");

  async function accept(id: string) {
    try {
      await mutateAsync(id);
      setMessage("accepted");
    } catch (error) {
      setMessage(
        error instanceof CoreHttpError && error.status === 409
          ? "needsRefresh"
          : error instanceof CoreHttpError && error.status === 403
            ? "checkEmailLink"
            : "failed",
      );
    }
  }

  if (isPending) {
    return <LoadingStatus label={t("loadingInvitations")} />;
  }

  if (error) {
    return (
      <RetryAlert
        message={t("loadFailed")}
        retryLabel={t("retry")}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!invitations?.length && !message) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ mt: 3 }}>
      <Typography variant="h2" component="h2">
        {t("pendingForYou")}
      </Typography>
      {message && (
        <Alert
          severity={message === "accepted" ? "success" : "error"}
          role="status"
        >
          {t(message)}
        </Alert>
      )}
      {invitations?.map((invitation) => (
        <Paper key={invitation.id} variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={1}>
            <Typography variant="h6">{invitation.organizationName}</Typography>
            <Typography color="text.secondary">
              {t("invitedAs", {
                role: t(invitation.role === "ADMIN" ? "admin" : "member"),
              })}
            </Typography>
            <Button
              variant="contained"
              disabled={accepting}
              onClick={() => void accept(invitation.id)}
              sx={{ alignSelf: "flex-start" }}
            >
              {t("acceptInvitation")}
            </Button>
          </Stack>
        </Paper>
      ))}
      {message === "needsRefresh" && (
        <Button onClick={() => void reauthenticate()}>
          {t("signInAgain")}
        </Button>
      )}
    </Stack>
  );
}
