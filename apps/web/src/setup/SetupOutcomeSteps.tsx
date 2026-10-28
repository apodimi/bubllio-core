import type Keycloak from "keycloak-js";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import type { SetupOperation } from "../setup-api";
import type { setupCopy, SetupLocale } from "../setup-copy";

type Copy = (typeof setupCopy)[SetupLocale];

export function LoadingStep({ label }: { label: string }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "center" }}
      role="status"
    >
      <CircularProgress size={20} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}

export function OperationStep({
  copy,
  operation,
  busy,
  retryFeedback,
  onRetry,
}: {
  copy: Copy;
  operation: SetupOperation;
  busy: boolean;
  retryFeedback: string;
  onRetry: () => void;
}) {
  return (
    <Stack spacing={2} aria-live="polite">
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box component="ol" sx={{ listStyle: "none", p: 0, m: 0 }}>
          {operation.stages.map((stage) => (
            <Box
              component="li"
              key={stage.name}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                py: 1.25,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { border: 0 },
              }}
            >
              <Typography variant="body2">
                {copy.stage[stage.name as keyof typeof copy.stage]}
              </Typography>
              <Typography
                variant="body2"
                color={
                  stage.status === "needs_attention"
                    ? "error.main"
                    : stage.status === "complete"
                      ? "success.main"
                      : "text.secondary"
                }
              >
                {
                  copy.stageStatus[
                    stage.status as keyof typeof copy.stageStatus
                  ]
                }
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
      {(operation.status === "needs_attention" ||
        operation.status === "awaiting_owner") && (
        <>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflowWrap: "anywhere" }}
          >
            {copy.reference}: {operation.correlationId}
          </Typography>
          {operation.status === "needs_attention" && (
            <Alert severity="warning">
              {copy.errorCode}: {operation.safeErrorCode ?? copy.unknown}
            </Alert>
          )}
          <Stack spacing={2} aria-busy={busy}>
            {operation.status === "awaiting_owner" && (
              <Alert severity="info">{copy.invitationActionHint}</Alert>
            )}
            {retryFeedback && <Alert severity="info">{retryFeedback}</Alert>}
            <Button
              type="button"
              variant="contained"
              onClick={onRetry}
              disabled={busy}
              startIcon={
                busy ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
              sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}
            >
              {busy
                ? copy.working
                : operation.status === "awaiting_owner"
                  ? copy.checkInvitation
                  : copy.retry}
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}

export function WorkspaceStep({
  keycloak,
  copy,
  complete,
}: {
  keycloak: Keycloak;
  copy: Copy;
  complete: boolean;
}) {
  return complete ? (
    <Button
      variant="contained"
      sx={{ alignSelf: "flex-start" }}
      onClick={() =>
        void keycloak.login({
          redirectUri: window.location.origin,
          prompt: "login",
        })
      }
    >
      {copy.enterWorkspace}
    </Button>
  ) : (
    <Button
      variant="contained"
      component="a"
      href="/"
      sx={{ alignSelf: "flex-start" }}
    >
      {copy.openWorkspace}
    </Button>
  );
}
