import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import type { EmailDeliverySettings } from "../setup-api";
import type { setupCopy, SetupLocale } from "../setup-copy";
import {
  useConfirmEmailDelivery,
  useEmailDeliveryStatus,
  useTestEmailDelivery,
} from "../setup-queries";
import {
  emailDeliveryFormReducer,
  initialEmailDeliveryFormState,
} from "./email-delivery.reducer";

type Copy = (typeof setupCopy)[SetupLocale];

export function EmailDeliveryStep({
  copy,
  onReady,
}: {
  copy: Copy;
  onReady: () => void;
}) {
  const [form, dispatch] = useReducer(
    emailDeliveryFormReducer,
    initialEmailDeliveryFormState,
  );
  const [testKey, setTestKey] = useState(() => crypto.randomUUID());
  const [confirmKey, setConfirmKey] = useState(() => crypto.randomUUID());
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const statusQuery = useEmailDeliveryStatus();
  const testMutation = useTestEmailDelivery();
  const confirmMutation = useConfirmEmailDelivery();
  const status = statusQuery.data;
  const waiting =
    !form.editing &&
    (status?.status === "awaiting_confirmation" ||
      (status?.status === "attention" && status.confirmationRetryable));
  const busy = testMutation.isPending || confirmMutation.isPending;

  useEffect(() => {
    if (status?.status === "ready") onReady();
  }, [onReady, status?.status]);

  useEffect(() => {
    if (testMutation.data || form.errorCode) resultHeading.current?.focus();
  }, [form.errorCode, testMutation.data]);

  function setField(
    field: Parameters<typeof emailDeliveryFormReducer>[1] extends infer Action
      ? Action extends { type: "set-field"; field: infer Field }
        ? Field
        : never
      : never,
    value: string,
  ) {
    dispatch({ type: "set-field", field, value });
    setTestKey(crypto.randomUUID());
  }

  async function submitTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "set-error", value: "" });
    const port = Number(form.port);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      dispatch({ type: "set-error", value: "EMAIL_INVALID_REQUEST" });
      return;
    }
    const settings: EmailDeliverySettings = {
      senderName: form.senderName.trim(),
      senderEmail: form.senderEmail.trim(),
      ...(form.replyToEmail.trim()
        ? { replyToEmail: form.replyToEmail.trim() }
        : {}),
      host: form.host.trim(),
      port,
      security: form.security,
      authentication: form.authentication,
      ...(form.authentication
        ? {
            username: form.username.trim(),
            password: form.password,
          }
        : {}),
      testRecipient: form.testRecipient.trim(),
    };
    try {
      await testMutation.mutateAsync({
        settings,
        setupSecret: form.setupSecret,
        idempotencyKey: testKey,
      });
      dispatch({ type: "set-editing", value: false });
      setConfirmKey(crypto.randomUUID());
    } catch (error) {
      const refreshed = await statusQuery.refetch();
      dispatch({
        type: "set-error",
        value:
          refreshed.data?.status === "attention"
            ? refreshed.data.safeErrorCode
            : errorCode(error),
      });
    } finally {
      dispatch({ type: "clear-secrets" });
      setTestKey(crypto.randomUUID());
    }
  }

  async function submitConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "set-error", value: "" });
    try {
      await confirmMutation.mutateAsync({
        confirmationCode: form.confirmationCode,
        setupSecret: form.setupSecret,
        idempotencyKey: confirmKey,
      });
    } catch (error) {
      const refreshed = await statusQuery.refetch();
      dispatch({
        type: "set-error",
        value:
          refreshed.data?.status === "attention"
            ? refreshed.data.safeErrorCode
            : errorCode(error),
      });
    } finally {
      dispatch({ type: "clear-secrets" });
      setConfirmKey(crypto.randomUUID());
    }
  }

  if (statusQuery.isPending) {
    return (
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center" }}
        role="status"
      >
        <CircularProgress size={20} />
        <Typography color="text.secondary">{copy.emailLoading}</Typography>
      </Stack>
    );
  }

  if (statusQuery.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => void statusQuery.refetch()}>
            {copy.tryAgain}
          </Button>
        }
      >
        {copy.emailUnavailable}
      </Alert>
    );
  }

  const errorMessage = form.errorCode
    ? emailErrorMessage(form.errorCode, copy)
    : status?.status === "attention"
      ? emailErrorMessage(status.safeErrorCode, copy)
      : "";

  if (waiting) {
    const recipient =
      testMutation.data?.maskedRecipient ?? copy.emailRecipientHidden;
    return (
      <Stack
        component="form"
        spacing={2.5}
        onSubmit={submitConfirmation}
        aria-busy={busy}
      >
        <Box role="status" aria-live="polite">
          <Typography
            ref={resultHeading}
            tabIndex={-1}
            variant="h5"
            component="h2"
          >
            {copy.emailTestSent}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {copy.emailTestSentBody.replace("{recipient}", recipient)}
          </Typography>
        </Box>
        {errorMessage && (
          <Alert severity="error" role="alert">
            {errorMessage}
          </Alert>
        )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            label={copy.emailConfirmationCode}
            value={form.confirmationCode}
            onChange={(event) =>
              dispatch({
                type: "set-field",
                field: "confirmationCode",
                value: event.target.value.replace(/\D/gu, "").slice(0, 6),
              })
            }
            autoComplete="one-time-code"
            required
            fullWidth
            slotProps={{
              htmlInput: {
                inputMode: "numeric",
                pattern: "[0-9]{6}",
                minLength: 6,
                maxLength: 6,
              },
            }}
          />
          <TextField
            label={copy.emailSetupSecret}
            type="password"
            value={form.setupSecret}
            onChange={(event) =>
              dispatch({
                type: "set-field",
                field: "setupSecret",
                value: event.target.value,
              })
            }
            autoComplete="off"
            spellCheck={false}
            required
            fullWidth
            slotProps={{ htmlInput: { minLength: 32 } }}
          />
        </Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ justifyContent: "space-between" }}
        >
          <Button
            type="button"
            color="inherit"
            disabled={busy}
            onClick={() => dispatch({ type: "set-editing", value: true })}
          >
            {copy.emailSendAgain}
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? copy.emailConfirming : copy.emailConfirm}
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack
      component="form"
      spacing={2.5}
      onSubmit={submitTest}
      aria-busy={busy}
    >
      {errorMessage && (
        <Alert severity="error" role="alert">
          <Typography ref={resultHeading} tabIndex={-1} component="span">
            {errorMessage}
          </Typography>
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
        }}
      >
        <TextField
          label={copy.emailSenderName}
          value={form.senderName}
          onChange={(event) => setField("senderName", event.target.value)}
          required
          fullWidth
          slotProps={{ htmlInput: { maxLength: 80 } }}
        />
        <TextField
          label={copy.emailSenderEmail}
          type="email"
          value={form.senderEmail}
          onChange={(event) => setField("senderEmail", event.target.value)}
          autoComplete="off"
          required
          fullWidth
        />
        <TextField
          label={copy.emailHost}
          value={form.host}
          onChange={(event) => setField("host", event.target.value)}
          autoComplete="off"
          spellCheck={false}
          required
          fullWidth
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(88px, .7fr) minmax(0, 1.3fr)",
            gap: 2,
          }}
        >
          <TextField
            label={copy.emailPort}
            type="number"
            value={form.port}
            onChange={(event) => setField("port", event.target.value)}
            required
            fullWidth
            slotProps={{ htmlInput: { min: 1, max: 65_535 } }}
          />
          <TextField
            select
            label={copy.emailSecurity}
            value={form.security}
            onChange={(event) => setField("security", event.target.value)}
            fullWidth
          >
            <MenuItem value="starttls">{copy.emailSecurityStarttls}</MenuItem>
            <MenuItem value="tls">{copy.emailSecurityTls}</MenuItem>
            <MenuItem value="none">{copy.emailSecurityNone}</MenuItem>
          </TextField>
        </Box>
      </Box>
      {form.security === "none" && (
        <Alert severity="warning">{copy.emailInsecureWarning}</Alert>
      )}
      <FormControlLabel
        control={
          <Switch
            checked={form.authentication}
            onChange={(_, value) => {
              dispatch({ type: "set-authentication", value });
              setTestKey(crypto.randomUUID());
            }}
          />
        }
        label={copy.emailAuthentication}
      />
      {form.authentication && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            label={copy.emailUsername}
            value={form.username}
            onChange={(event) => setField("username", event.target.value)}
            autoComplete="off"
            required
            fullWidth
          />
          <TextField
            label={copy.emailPassword}
            type="password"
            value={form.password}
            onChange={(event) => setField("password", event.target.value)}
            autoComplete="off"
            required
            fullWidth
          />
        </Box>
      )}
      <Button
        type="button"
        variant="text"
        sx={{ alignSelf: "flex-start" }}
        aria-expanded={form.advanced}
        onClick={() =>
          dispatch({ type: "set-advanced", value: !form.advanced })
        }
      >
        {copy.emailAdvanced}
      </Button>
      <Collapse in={form.advanced}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
            pt: 0.5,
          }}
        >
          <TextField
            label={copy.emailReplyTo}
            type="email"
            value={form.replyToEmail}
            onChange={(event) => setField("replyToEmail", event.target.value)}
            autoComplete="off"
            fullWidth
          />
        </Box>
      </Collapse>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
        }}
      >
        <TextField
          label={copy.emailTestRecipient}
          type="email"
          value={form.testRecipient}
          onChange={(event) => setField("testRecipient", event.target.value)}
          autoComplete="off"
          required
          fullWidth
        />
        <TextField
          label={copy.emailSetupSecret}
          type="password"
          value={form.setupSecret}
          onChange={(event) => setField("setupSecret", event.target.value)}
          autoComplete="off"
          spellCheck={false}
          required
          fullWidth
          slotProps={{ htmlInput: { minLength: 32 } }}
        />
      </Box>
      <Button
        type="submit"
        variant="contained"
        disabled={busy}
        sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}
      >
        {busy ? copy.emailSendingTest : copy.emailSendTest}
      </Button>
    </Stack>
  );
}

function errorCode(error: unknown): string {
  return error instanceof Error ? error.message : "EMAIL_UNAVAILABLE";
}

function emailErrorMessage(code: string, copy: Copy): string {
  if (code === "EMAIL_DELIVERY_UNAVAILABLE") return copy.emailConnectionFailed;
  if (code === "EMAIL_DELIVERY_AUTHENTICATION_FAILED")
    return copy.emailAuthenticationFailed;
  if (code === "EMAIL_DELIVERY_TLS_FAILED") return copy.emailTlsFailed;
  if (code === "EMAIL_DELIVERY_REJECTED") return copy.emailSenderRejected;
  if (
    code === "EMAIL_CONFIRMATION_INVALID" ||
    code === "EMAIL_CONFIRMATION_EXPIRED"
  )
    return copy.emailCodeInvalid;
  if (code === "IDENTITY_ACTIVATION_FAILED")
    return copy.emailIdentityActivationFailed;
  if (code === "EMAIL_INVALID_REQUEST") return copy.invalid;
  return copy.emailUnavailable;
}
