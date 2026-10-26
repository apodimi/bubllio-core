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
type EmailFieldName =
  | "senderName"
  | "senderEmail"
  | "replyToEmail"
  | "host"
  | "port"
  | "username"
  | "password"
  | "testRecipient"
  | "setupSecret"
  | "confirmationCode";
type FieldErrors = Partial<Record<EmailFieldName, string>>;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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

  function setField(field: EmailFieldName | "security", value: string) {
    dispatch({ type: "set-field", field, value });
    if (field !== "security")
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setTestKey(crypto.randomUUID());
  }

  async function submitTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "set-error", value: "" });
    const validationErrors = validateTestForm(form, copy);
    setFieldErrors(validationErrors);
    const firstInvalid = TEST_FIELD_ORDER.find(
      (field) => validationErrors[field],
    );
    if (firstInvalid) {
      const formElement = event.currentTarget;
      if (firstInvalid === "replyToEmail" && !form.advanced) {
        dispatch({ type: "set-advanced", value: true });
        requestAnimationFrame(() =>
          focusNamedControl(formElement, firstInvalid),
        );
      } else {
        focusNamedControl(formElement, firstInvalid);
      }
      return;
    }
    const port = Number(form.port);
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
    const validationErrors = validateConfirmationForm(form, copy);
    setFieldErrors(validationErrors);
    const firstInvalid = CONFIRMATION_FIELD_ORDER.find(
      (field) => validationErrors[field],
    );
    if (firstInvalid) {
      focusNamedControl(event.currentTarget, firstInvalid);
      return;
    }
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
        noValidate
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
            name="confirmationCode"
            value={form.confirmationCode}
            onChange={(event) => {
              dispatch({
                type: "set-field",
                field: "confirmationCode",
                value: event.target.value.replace(/\D/gu, "").slice(0, 6),
              });
              setFieldErrors((current) => ({
                ...current,
                confirmationCode: undefined,
              }));
            }}
            autoComplete="one-time-code"
            required
            fullWidth
            error={Boolean(fieldErrors.confirmationCode)}
            helperText={fieldErrors.confirmationCode}
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
            name="setupSecret"
            type="password"
            value={form.setupSecret}
            onChange={(event) => {
              dispatch({
                type: "set-field",
                field: "setupSecret",
                value: event.target.value,
              });
              setFieldErrors((current) => ({
                ...current,
                setupSecret: undefined,
              }));
            }}
            autoComplete="off"
            spellCheck={false}
            required
            fullWidth
            error={Boolean(fieldErrors.setupSecret)}
            helperText={fieldErrors.setupSecret}
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
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            startIcon={
              busy ? <CircularProgress size={18} color="inherit" /> : undefined
            }
          >
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
      noValidate
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
          name="senderName"
          value={form.senderName}
          onChange={(event) => setField("senderName", event.target.value)}
          required
          fullWidth
          error={Boolean(fieldErrors.senderName)}
          helperText={fieldErrors.senderName}
          slotProps={{ htmlInput: { maxLength: 80 } }}
        />
        <TextField
          label={copy.emailSenderEmail}
          name="senderEmail"
          type="email"
          value={form.senderEmail}
          onChange={(event) => setField("senderEmail", event.target.value)}
          autoComplete="email"
          required
          fullWidth
          error={Boolean(fieldErrors.senderEmail)}
          helperText={fieldErrors.senderEmail}
        />
        <TextField
          label={copy.emailHost}
          name="host"
          value={form.host}
          onChange={(event) => setField("host", event.target.value)}
          autoComplete="off"
          spellCheck={false}
          required
          fullWidth
          error={Boolean(fieldErrors.host)}
          helperText={fieldErrors.host}
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
            name="port"
            type="number"
            value={form.port}
            onChange={(event) => setField("port", event.target.value)}
            required
            fullWidth
            error={Boolean(fieldErrors.port)}
            helperText={fieldErrors.port}
            slotProps={{
              htmlInput: { min: 1, max: 65_535, inputMode: "numeric" },
            }}
          />
          <TextField
            select
            label={copy.emailSecurity}
            name="security"
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
            name="authentication"
            checked={form.authentication}
            onChange={(_, value) => {
              dispatch({ type: "set-authentication", value });
              if (!value)
                setFieldErrors((current) => ({
                  ...current,
                  username: undefined,
                  password: undefined,
                }));
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
            name="username"
            value={form.username}
            onChange={(event) => setField("username", event.target.value)}
            autoComplete="username"
            required
            fullWidth
            error={Boolean(fieldErrors.username)}
            helperText={fieldErrors.username}
          />
          <TextField
            label={copy.emailPassword}
            name="password"
            type="password"
            value={form.password}
            onChange={(event) => setField("password", event.target.value)}
            autoComplete="off"
            required
            fullWidth
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
          />
        </Box>
      )}
      <Button
        type="button"
        variant="text"
        sx={{ alignSelf: "flex-start" }}
        aria-expanded={form.advanced}
        aria-controls="email-advanced-settings"
        onClick={() =>
          dispatch({ type: "set-advanced", value: !form.advanced })
        }
      >
        {form.advanced ? copy.emailAdvancedHide : copy.emailAdvancedShow}
      </Button>
      <Collapse id="email-advanced-settings" in={form.advanced}>
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
            name="replyToEmail"
            type="email"
            value={form.replyToEmail}
            onChange={(event) => setField("replyToEmail", event.target.value)}
            autoComplete="email"
            fullWidth
            error={Boolean(fieldErrors.replyToEmail)}
            helperText={fieldErrors.replyToEmail}
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
          name="testRecipient"
          type="email"
          value={form.testRecipient}
          onChange={(event) => setField("testRecipient", event.target.value)}
          autoComplete="email"
          required
          fullWidth
          error={Boolean(fieldErrors.testRecipient)}
          helperText={fieldErrors.testRecipient}
        />
        <TextField
          label={copy.emailSetupSecret}
          name="setupSecret"
          type="password"
          value={form.setupSecret}
          onChange={(event) => setField("setupSecret", event.target.value)}
          autoComplete="off"
          spellCheck={false}
          required
          fullWidth
          error={Boolean(fieldErrors.setupSecret)}
          helperText={fieldErrors.setupSecret}
          slotProps={{ htmlInput: { minLength: 32 } }}
        />
      </Box>
      <Button
        type="submit"
        variant="contained"
        disabled={busy}
        startIcon={
          busy ? <CircularProgress size={18} color="inherit" /> : undefined
        }
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

const TEST_FIELD_ORDER: readonly EmailFieldName[] = [
  "senderName",
  "senderEmail",
  "host",
  "port",
  "username",
  "password",
  "replyToEmail",
  "testRecipient",
  "setupSecret",
];
const CONFIRMATION_FIELD_ORDER: readonly EmailFieldName[] = [
  "confirmationCode",
  "setupSecret",
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function validateTestForm(
  form: typeof initialEmailDeliveryFormState,
  copy: Copy,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.senderName.trim())
    errors.senderName = copy.fieldRequired(copy.emailSenderName);
  if (!form.senderEmail.trim())
    errors.senderEmail = copy.fieldRequired(copy.emailSenderEmail);
  else if (!EMAIL_PATTERN.test(form.senderEmail.trim()))
    errors.senderEmail = copy.validEmail;
  if (!form.host.trim()) errors.host = copy.fieldRequired(copy.emailHost);
  const port = Number(form.port);
  if (!Number.isInteger(port) || port < 1 || port > 65_535)
    errors.port = copy.validPort;
  if (form.authentication && !form.username.trim())
    errors.username = copy.fieldRequired(copy.emailUsername);
  if (form.authentication && !form.password)
    errors.password = copy.fieldRequired(copy.emailPassword);
  if (form.replyToEmail.trim() && !EMAIL_PATTERN.test(form.replyToEmail.trim()))
    errors.replyToEmail = copy.validEmail;
  if (!form.testRecipient.trim())
    errors.testRecipient = copy.fieldRequired(copy.emailTestRecipient);
  else if (!EMAIL_PATTERN.test(form.testRecipient.trim()))
    errors.testRecipient = copy.validEmail;
  if (form.setupSecret.length < 32) errors.setupSecret = copy.validSetupSecret;
  return errors;
}

function validateConfirmationForm(
  form: typeof initialEmailDeliveryFormState,
  copy: Copy,
): FieldErrors {
  return {
    ...(form.confirmationCode.length === 6
      ? {}
      : { confirmationCode: copy.validConfirmationCode }),
    ...(form.setupSecret.length >= 32
      ? {}
      : { setupSecret: copy.validSetupSecret }),
  };
}

function focusNamedControl(form: HTMLFormElement, name: EmailFieldName) {
  const control = form.elements.namedItem(name);
  if (control instanceof HTMLElement) control.focus();
}
