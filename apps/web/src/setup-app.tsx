import { useEffect, useState, type FormEvent } from "react";
import type Keycloak from "keycloak-js";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { BrandLogo } from "./brand-logo";
import type { SetupOperation } from "./setup-api";
import { setupCopy, type SetupLocale } from "./setup-copy";
import { SetupProgress } from "./setup-progress";
import {
  useClaimSetup,
  useCreateFirstOrganization,
  useCurrentSetup,
  useRetrySetupOperation,
  useSetupOperation,
  useSetupStatus,
} from "./setup-queries";

type Step =
  | "loading"
  | "unavailable"
  | "intro"
  | "resume"
  | "taken"
  | "secret"
  | "organization"
  | "progress"
  | "done"
  | "closed";

export function SetupApp({ keycloak }: { keycloak: Keycloak }) {
  const [locale, setLocale] = useState<SetupLocale>(() =>
    navigator.language.startsWith("el") ? "el" : "en",
  );
  const [step, setStep] = useState<Step>("loading");
  const [secret, setSecret] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [operation, setOperation] = useState<SetupOperation>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [claimKey] = useState(() => crypto.randomUUID());
  const [organizationKey] = useState(() => crypto.randomUUID());
  const statusQuery = useSetupStatus();
  const currentQuery = useCurrentSetup(keycloak);
  const operationQuery = useSetupOperation(keycloak, operation?.id);
  const claimMutation = useClaimSetup(keycloak);
  const organizationMutation = useCreateFirstOrganization(keycloak);
  const retryMutation = useRetrySetupOperation(keycloak);
  const copy = setupCopy[locale];
  const activeStage =
    step === "secret" || step === "resume" || step === "taken"
      ? 1
      : step === "organization"
        ? 2
        : step === "progress" || step === "done" || step === "closed"
          ? 3
          : 0;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (step !== "loading") return;
    if (statusQuery.isError || currentQuery.isError) {
      setError(copy.unavailable);
      setStep("unavailable");
      return;
    }
    const status = statusQuery.data;
    if (!status) return;
    if (!keycloak.authenticated) {
      setStep(
        status.phase === "new"
          ? "intro"
          : status.phase === "in_progress"
            ? "resume"
            : "closed",
      );
      return;
    }
    const current = currentQuery.data;
    if (!current) return;
    if (current.state === "operation") {
      setOperation(current.operation);
      setStep(current.operation.status === "succeeded" ? "done" : "progress");
    } else if (!status.setupRequired) {
      setStep("closed");
    } else {
      setStep(
        current.state === "claimed"
          ? "organization"
          : status.phase === "in_progress"
            ? "taken"
            : "secret",
      );
    }
  }, [
    step,
    statusQuery.data,
    statusQuery.isError,
    currentQuery.data,
    currentQuery.isError,
    keycloak.authenticated,
    copy.unavailable,
  ]);

  useEffect(() => {
    const updated = operationQuery.data;
    if (step !== "progress" || !updated || updated.id !== operation?.id) return;
    setOperation(updated);
    setError("");
    if (updated.status === "succeeded") setStep("done");
  }, [operationQuery.data, operation?.id, step]);

  useEffect(() => {
    if (step === "progress" && operationQuery.isError)
      setError(copy.unavailable);
  }, [step, operationQuery.isError, copy.unavailable]);

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await claimMutation.mutateAsync({ secret, key: claimKey });
      setSecret("");
      setStep("organization");
    } catch (cause) {
      setSecret("");
      setError(messageFor(cause, copy));
    } finally {
      setBusy(false);
    }
  }

  async function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await organizationMutation.mutateAsync({
        displayName: organizationName,
        key: organizationKey,
      });
      setOperation(result);
      setStep(result.status === "succeeded" ? "done" : "progress");
    } catch (cause) {
      setError(messageFor(cause, copy));
    } finally {
      setBusy(false);
    }
  }

  async function submitRetry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!operation) return;
    setBusy(true);
    setError("");
    try {
      const result = await retryMutation.mutateAsync({
        id: operation.id,
        secret,
      });
      setSecret("");
      setOperation(result);
      setStep(result.status === "succeeded" ? "done" : "progress");
    } catch (cause) {
      setSecret("");
      setError(messageFor(cause, copy));
    } finally {
      setBusy(false);
    }
  }

  const pageTitle =
    step === "intro"
      ? copy.beginTitle
      : step === "resume"
        ? copy.resumeTitle
        : step === "taken"
          ? copy.takenTitle
          : step === "secret"
            ? copy.authorityTitle
            : step === "organization"
              ? copy.organizationTitle
              : step === "progress"
                ? operation?.status === "awaiting_owner"
                  ? copy.invitationTitle
                  : operation?.status === "needs_attention"
                    ? copy.attentionTitle
                    : copy.progressTitle
                : step === "done"
                  ? copy.doneTitle
                  : step === "closed"
                    ? copy.closedTitle
                    : step === "unavailable"
                      ? copy.unavailableTitle
                      : copy.title;
  const pageBody =
    step === "intro"
      ? copy.beginBody
      : step === "resume"
        ? copy.resumeBody
        : step === "taken"
          ? copy.takenBody
          : step === "secret"
            ? copy.authorityBody
            : step === "organization"
              ? copy.organizationBody
              : step === "progress"
                ? operation?.status === "awaiting_owner"
                  ? copy.invitationBody
                  : operation?.status === "needs_attention"
                    ? copy.attentionBody
                    : copy.progressBody
                : step === "done"
                  ? copy.doneBody
                  : step === "closed"
                    ? copy.closedBody
                    : step === "unavailable"
                      ? copy.unavailableHelp
                      : copy.intro;

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        py: { xs: 2, md: 7 },
        px: 2,
        display: "grid",
        placeItems: "center",
      }}
    >
      <Container
        maxWidth={false}
        sx={{ maxWidth: "860px !important", px: "0 !important" }}
      >
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Stack
            spacing={3.5}
            sx={{ p: { xs: 2.5, sm: 4.5, md: 6 }, minWidth: 0 }}
          >
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <BrandLogo />
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={locale}
                  onChange={(_, value: SetupLocale | null) =>
                    value && setLocale(value)
                  }
                  aria-label="Language"
                >
                  <ToggleButton value="el" aria-label="Ελληνικά">
                    ΕΛ
                  </ToggleButton>
                  <ToggleButton value="en" aria-label="English">
                    EN
                  </ToggleButton>
                </ToggleButtonGroup>
                {keycloak.authenticated && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      void keycloak.logout({
                        redirectUri: `${window.location.origin}/setup`,
                      })
                    }
                  >
                    {copy.signOut}
                  </Button>
                )}
              </Stack>
            </Stack>
            <Box sx={{ pt: { xs: 1, sm: 2 } }}>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  maxWidth: 620,
                  fontSize: { xs: "1.85rem", sm: "2.35rem" },
                  lineHeight: 1.15,
                }}
              >
                {pageTitle}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 1.5, lineHeight: 1.65, maxWidth: 620 }}
              >
                {pageBody}
              </Typography>
            </Box>
            <SetupProgress
              activeStage={
                step === "done" || step === "closed" ? 4 : activeStage
              }
              labels={copy.railSteps}
              progressLabel={copy.progressLabel}
              statusLabels={copy.stepStatus}
            />
            {error && (
              <Alert severity="error" role="alert">
                {error}
              </Alert>
            )}
            {step === "loading" && (
              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: "center" }}
                role="status"
              >
                <CircularProgress size={20} />
                <Typography color="text.secondary">{copy.loading}</Typography>
              </Stack>
            )}
            {step === "unavailable" && (
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
                sx={{ alignSelf: "flex-start" }}
              >
                {copy.tryAgain}
              </Button>
            )}
            {step === "intro" && (
              <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
                <Button
                  variant="contained"
                  onClick={() =>
                    void keycloak.register({
                      redirectUri: `${window.location.origin}/setup`,
                    })
                  }
                >
                  {copy.createAccount}
                </Button>
              </Stack>
            )}
            {step === "resume" && (
              <Button
                variant="contained"
                sx={{ alignSelf: "flex-start" }}
                onClick={() =>
                  void keycloak.login({
                    redirectUri: `${window.location.origin}/setup`,
                  })
                }
              >
                {copy.resume}
              </Button>
            )}
            {step === "secret" && (
              <Stack
                component="form"
                spacing={2.5}
                onSubmit={(event) => void submitClaim(event)}
              >
                <TextField
                  id="setup-secret"
                  label={copy.secretLabel}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  required
                  slotProps={{ htmlInput: { minLength: 32 } }}
                  fullWidth
                  size="small"
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={busy}
                  sx={{ alignSelf: "flex-end" }}
                >
                  {busy ? copy.working : copy.continue}
                </Button>
              </Stack>
            )}
            {step === "organization" && (
              <Stack
                component="form"
                spacing={2.5}
                onSubmit={(event) => void submitOrganization(event)}
              >
                <TextField
                  id="organization-name"
                  label={copy.organizationLabel}
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  required
                  slotProps={{ htmlInput: { minLength: 2, maxLength: 120 } }}
                  fullWidth
                  size="small"
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={busy}
                  sx={{ alignSelf: "flex-end" }}
                >
                  {busy ? copy.working : copy.create}
                </Button>
              </Stack>
            )}
            {step === "progress" && operation && (
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
                        {copy.errorCode}:{" "}
                        {operation.safeErrorCode ?? copy.unknown}
                      </Alert>
                    )}
                    <Stack
                      component="form"
                      spacing={2}
                      onSubmit={(event) => void submitRetry(event)}
                    >
                      <TextField
                        id="retry-secret"
                        label={copy.retrySecret}
                        type="password"
                        autoComplete="off"
                        value={secret}
                        onChange={(event) => setSecret(event.target.value)}
                        required
                        fullWidth
                        size="small"
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={busy}
                        sx={{ alignSelf: "flex-end" }}
                      >
                        {busy ? copy.working : copy.retry}
                      </Button>
                    </Stack>
                  </>
                )}
              </Stack>
            )}
            {step === "done" && (
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
            )}
            {step === "closed" && (
              <Button
                variant="contained"
                component="a"
                href="/"
                sx={{ alignSelf: "flex-start" }}
              >
                {copy.openWorkspace}
              </Button>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

function messageFor(
  error: unknown,
  copy: (typeof setupCopy)[SetupLocale],
): string {
  const code = error instanceof Error ? error.message : "";
  if (code === "SESSION_EXPIRED" || code === "UNAUTHENTICATED")
    return copy.sessionExpired;
  if (code === "SETUP_CLAIM_CONFLICT") return copy.conflict;
  if (code === "SETUP_INVALID_REQUEST") return copy.invalid;
  if (code === "SETUP_UNAVAILABLE") return copy.unavailable;
  return copy.unavailable;
}
