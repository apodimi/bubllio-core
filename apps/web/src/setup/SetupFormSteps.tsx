import type { FormEvent } from "react";
import type Keycloak from "keycloak-js";
import { Button, Stack, TextField } from "@mui/material";

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
  if (step === "intro")
    return (
      <Button
        variant="contained"
        onClick={() =>
          void keycloak.register({
            redirectUri: `${window.location.origin}/setup`,
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
            redirectUri: `${window.location.origin}/setup`,
          })
        }
      >
        {copy.resume}
      </Button>
    );
  if (step !== "secret") return null;
  return (
    <Stack component="form" spacing={2.5} onSubmit={onClaim}>
      <TextField
        id="setup-secret"
        label={copy.secretLabel}
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={secret}
        onChange={(event) => onSecretChange(event.target.value)}
        required
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
  return (
    <Stack component="form" spacing={2.5} onSubmit={onSubmit}>
      <TextField
        id="organization-name"
        label={copy.organizationLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
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
      sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}
    >
      {busy ? busyLabel : idleLabel}
    </Button>
  );
}
