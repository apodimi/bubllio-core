import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { useInvitationActions } from "../hooks/usePeople";
import type { Invitation } from "../schemas/people.schema";

interface OrganizationInvitationsProps {
  invitations: Invitation[];
  organizationId: string;
  subject: string | undefined;
}

export function OrganizationInvitations(props: OrganizationInvitationsProps) {
  const { invitations, organizationId, subject } = props;
  const { t } = useTranslation("translation", { keyPrefix: "people" });
  const { resend, revoke } = useInvitationActions(subject, organizationId);
  const [revokeId, setRevokeId] = useState("");
  const [message, setMessage] = useState<
    "resent" | "revoked" | "actionFailed" | ""
  >("");
  const busy = resend.isPending || revoke.isPending;
  const retryingRevoke = invitations.some(
    (invitation) =>
      invitation.id === revokeId && invitation.status === "REVOCATION_PENDING",
  );

  async function sendAgain(id: string) {
    try {
      await resend.mutateAsync(id);
      setMessage("resent");
    } catch {
      setMessage("actionFailed");
    }
  }

  async function confirmRevoke() {
    const id = revokeId;
    setRevokeId("");
    try {
      await revoke.mutateAsync(id);
      setMessage("revoked");
    } catch {
      setMessage("actionFailed");
    }
  }

  return (
    <Box>
      <Typography variant="h2" component="h2" sx={{ mb: 2 }}>
        {t("pending")}
      </Typography>
      {message && (
        <Alert
          severity={message === "actionFailed" ? "error" : "success"}
          role="status"
          sx={{ mb: 2 }}
        >
          {t(message)}
        </Alert>
      )}
      {invitations.length ? (
        <Stack spacing={1.5}>
          {invitations.map((invitation) => (
            <Paper key={invitation.id} variant="outlined" sx={{ p: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { sm: "center" },
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>
                    {invitation.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(invitation.role === "ADMIN" ? "admin" : "member")} ·{" "}
                    {t("appCount", {
                      count: invitation.applicationKeys.length,
                    })}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", flexWrap: "wrap" }}
                >
                  <Chip
                    size="small"
                    label={t(
                      invitation.status === "RESENDING"
                        ? "resendingStatus"
                        : invitation.status === "REVOCATION_PENDING"
                          ? "revocationPendingStatus"
                          : invitation.status === "EXPIRED"
                            ? "expiredStatus"
                            : invitation.status === "DELIVERY_FAILED"
                              ? "deliveryFailedStatus"
                              : "pendingStatus",
                    )}
                  />
                  {invitation.status !== "REVOCATION_PENDING" &&
                    invitation.status !== "RESENDING" && (
                      <Button
                        size="small"
                        disabled={busy}
                        onClick={() => void sendAgain(invitation.id)}
                      >
                        {t("resend")}
                      </Button>
                    )}
                  <Button
                    size="small"
                    color="error"
                    disabled={busy || invitation.status === "RESENDING"}
                    onClick={() => setRevokeId(invitation.id)}
                  >
                    {t(
                      invitation.status === "REVOCATION_PENDING"
                        ? "retryRevoke"
                        : "revoke",
                    )}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Alert severity="info">{t("noPending")}</Alert>
      )}
      <Dialog open={Boolean(revokeId)} onClose={() => setRevokeId("")}>
        <DialogTitle>
          {t(retryingRevoke ? "retryRevokeTitle" : "revokeTitle")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{t("revokeBody")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeId("")} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy}
            onClick={() => void confirmRevoke()}
          >
            {t(retryingRevoke ? "retryRevoke" : "revoke")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
