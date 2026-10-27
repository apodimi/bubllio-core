import { useRef, useState, type FormEvent } from "react";
import type Keycloak from "keycloak-js";
import { Button, CircularProgress, Stack, TextField } from "@mui/material";

import type { setupCopy, SetupLocale } from "../setup-copy";

type Copy = (typeof setupCopy)[SetupLocale];

export function AccountStep({
  step,
  keycloak,
  copy,
  secret,
  busy,
  onSecretChange,
  onClaim,
}: {
  step: "intro" | "resume" | "taken" | "secret";
  keycloak: Keycloak;
  copy: Copy;
  secret: string;
  busy: boolean;
  onSecretChange: (value: string) => void;
  onClaim: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [fieldError, setFieldError] = useState("");
  const secretInput = useRef<HTMLInputElement>(null);

  if (step === "intro")
    return (
      <Button
        variant="contained"
        onClick={() =>
          void keycloak.register({
            redirectUri: window.location.origin,
          })
        }
        sx={{ alignSelf: "flex-start" }}
      >
        {copy.createAccount}
      </Button>
    );
  if (step === "resume")
    return (
      <Button
        variant="contained"
        sx={{ alignSelf: "flex-start" }}
        onClick={() =>
          void keycloak.login({
            redirectUri: window.location.origin,
          })
        }
      >
        {copy.resume}
      </Button>
    );
  if (step !== "secret") return null;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (secret.length < 32) {
      setFieldError(copy.validSetupSecret);
      secretInput.current?.focus();
      return;
    }
    setFieldError("");
    onClaim(event);
  }
  return (
    <Stack
      component="form"
      spacing={2.5}
      onSubmit={submit}
      aria-busy={busy}
      noValidate
    >
      <TextField
        id="setup-secret"
        name="setupSecret"
        label={copy.secretLabel}
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={secret}
        onChange={(event) => {
          onSecretChange(event.target.value);
          setFieldError("");
        }}
        inputRef={secretInput}
        required
        error={Boolean(fieldError)}
        helperText={fieldError}
        slotProps={{ htmlInput: { minLength: 32 } }}
        fullWidth
      />
      <SubmitButton
        busy={busy}
        idleLabel={copy.continue}
        busyLabel={copy.working}
      />
    </Stack>
  );
}

export function OrganizationStep({
  copy,
  value,
  busy,
  onChange,
  onSubmit,
}: {
  copy: Copy;
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [fieldError, setFieldError] = useState("");
  const organizationInput = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const length = value.trim().length;
    if (length < 2 || length > 120) {
      setFieldError(copy.validOrganizationName);
      organizationInput.current?.focus();
      return;
    }
    setFieldError("");
    onSubmit(event);
  }

  return (
    <Stack
      component="form"
      spacing={2.5}
      onSubmit={submit}
      aria-busy={busy}
      noValidate
    >
      <TextField
        id="organization-name"
        name="organizationName"
        label={copy.organizationLabel}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setFieldError("");
        }}
        inputRef={organizationInput}
        autoComplete="organization"
        required
        error={Boolean(fieldError)}
        helperText={fieldError}
        slotProps={{ htmlInput: { minLength: 2, maxLength: 120 } }}
        fullWidth
      />
      <SubmitButton
        busy={busy}
        idleLabel={copy.create}
        busyLabel={copy.working}
      />
    </Stack>
  );
}

function SubmitButton({
  busy,
  idleLabel,
  busyLabel,
}: {
  busy: boolean;
  idleLabel: string;
  busyLabel: string;
}) {
  return (
    <Button
      type="submit"
      variant="contained"
      disabled={busy}
      startIcon={
        busy ? <CircularProgress size={18} color="inherit" /> : undefined
      }
      sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}
    >
      {busy ? busyLabel : idleLabel}
    </Button>
  );
}
