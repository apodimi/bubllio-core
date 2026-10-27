import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import type { SystemPreflight } from "../setup-api";
import type { setupCopy, SetupLocale } from "../setup-copy";

type Copy = (typeof setupCopy)[SetupLocale];

export function PreflightStep({
  copy,
  preflight,
  loading,
  error,
  onRetry,
}: {
  copy: Copy;
  preflight?: SystemPreflight;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const ready = preflight?.status === "ready";
  return (
    <Stack spacing={2.5} aria-live="polite" aria-busy={loading}>
      {loading && (
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center" }}
          role="status"
        >
          <CircularProgress size={20} />
          <Typography color="text.secondary">
            {copy.preflightLoading}
          </Typography>
        </Stack>
      )}
      {!loading && preflight && (
        <Box
          component="ul"
          aria-label={copy.preflightTitle}
          sx={{
            listStyle: "none",
            p: 0,
            m: 0,
            borderBlock: "1px solid",
            borderColor: "divider",
          }}
        >
          {preflight.checks.map((check) => (
            <Box
              component="li"
              key={check.key}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                py: 1.75,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: 0 },
              }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center" }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor:
                      check.status === "ready"
                        ? "success.main"
                        : "warning.main",
                    flex: "0 0 auto",
                  }}
                />
                <Typography sx={{ fontWeight: 600 }}>
                  {copy.systemChecks[check.key]}
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                color={
                  check.status === "ready" ? "success.main" : "warning.dark"
                }
                sx={{ fontWeight: 700, textAlign: "right" }}
              >
                {copy.checkStatus[check.status]}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {!loading && (error || preflight?.status === "attention") && (
        <Alert severity={error ? "error" : "warning"} role="alert">
          {error ? copy.preflightUnavailable : copy.preflightAttention}
        </Alert>
      )}
      {!loading && !ready && (
        <Button
          variant="contained"
          onClick={onRetry}
          sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}
        >
          {copy.preflightRetry}
        </Button>
      )}
    </Stack>
  );
}
