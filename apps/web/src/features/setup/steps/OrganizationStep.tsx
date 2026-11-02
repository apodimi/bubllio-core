import { useRef, useState, type FormEvent } from "react";
import { Stack, TextField } from "@mui/material";
import type { SetupCopy as Copy } from "../../../../locales";
import { SubmitButton } from "../components/SubmitButton";

interface OrganizationStepProps {
  copy: Copy;
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function OrganizationStep(props: OrganizationStepProps) {
  const { copy, value, busy, onChange, onSubmit } = props;
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
