import { useRef, useState, type FormEvent } from "react";
import { Button, Stack, TextField } from "@mui/material";
import { useAuth } from "@/features/auth";
import type { SetupCopy as Copy } from "../../../../locales";
import { SubmitButton } from "../components/SubmitButton";

interface AccountStepProps {
  step: "intro" | "resume" | "taken" | "secret";
  copy: Copy;
  secret: string;
  busy: boolean;
  onSecretChange: (value: string) => void;
  onClaim: (event: FormEvent<HTMLFormElement>) => void;
}

export function AccountStep(props: AccountStepProps) {
  const { step, copy, secret, busy, onSecretChange, onClaim } = props;
  const { register, signIn } = useAuth();
  const [fieldError, setFieldError] = useState("");
  const secretInput = useRef<HTMLInputElement>(null);

  if (step === "intro") {
    return (
      <Button
        variant="contained"
        onClick={() => void register()}
        sx={{ alignSelf: "flex-start" }}
      >
        {copy.createAccount}
      </Button>
    );
  }
  if (step === "resume") {
    return (
      <Button
        variant="contained"
        sx={{ alignSelf: "flex-start" }}
        onClick={() => void signIn()}
      >
        {copy.resume}
      </Button>
    );
  }
  if (step !== "secret") {
    return null;
  }
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
