import { Box, FormControlLabel, Stack, Switch } from "@mui/material";
import { Controller, type Control } from "react-hook-form";

import type { EmailSettingsValues } from "../../schemas/emailDeliveryForm.schema";
import type { SetupCopy } from "../../../../../locales";
import { SettingsTextField } from "./SettingsTextField";

interface EmailAuthenticationFieldsProps {
  authentication: boolean;
  control: Control<EmailSettingsValues>;
  copy: SetupCopy;
  onAuthenticationChange: (checked: boolean) => void;
  onValueChange: () => void;
}

export function EmailAuthenticationFields(
  props: EmailAuthenticationFieldsProps,
) {
  const {
    authentication,
    control,
    copy,
    onAuthenticationChange,
    onValueChange,
  } = props;

  return (
    <Stack spacing={2.5}>
      <Controller
        control={control}
        name="authentication"
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                name={field.name}
                slotProps={{ input: { ref: field.ref } }}
                checked={field.value}
                onBlur={field.onBlur}
                onChange={(_, checked) => {
                  field.onChange(checked);
                  onAuthenticationChange(checked);
                }}
              />
            }
            label={copy.emailAuthentication}
          />
        )}
      />
      {authentication && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <SettingsTextField
            control={control}
            name="username"
            label={copy.emailUsername}
            autoComplete="username"
            required
            onValueChange={onValueChange}
          />
          <SettingsTextField
            control={control}
            name="password"
            label={copy.emailPassword}
            type="password"
            autoComplete="off"
            required
            onValueChange={onValueChange}
          />
        </Box>
      )}
    </Stack>
  );
}
