import { Box, TextField } from "@mui/material";
import { Controller, type Control } from "react-hook-form";

import type { EmailConfirmationValues } from "../../schemas/emailDeliveryForm.schema";
import type { SetupCopy } from "../../../../../locales";

interface EmailConfirmationFieldsProps {
  control: Control<EmailConfirmationValues>;
  copy: SetupCopy;
  onValueChange: () => void;
}

export function EmailConfirmationFields(props: EmailConfirmationFieldsProps) {
  const { control, copy, onValueChange } = props;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 2,
      }}
    >
      <Controller
        control={control}
        name="confirmationCode"
        render={({ field, fieldState }) => (
          <TextField
            name={field.name}
            value={field.value}
            onBlur={field.onBlur}
            inputRef={field.ref}
            label={copy.emailConfirmationCode}
            onChange={(event) => {
              field.onChange(
                event.target.value.replace(/\D/gu, "").slice(0, 6),
              );
              onValueChange();
            }}
            autoComplete="one-time-code"
            required
            fullWidth
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message}
            slotProps={{
              htmlInput: {
                inputMode: "numeric",
                pattern: "[0-9]{6}",
                minLength: 6,
                maxLength: 6,
              },
            }}
          />
        )}
      />
      <Controller
        control={control}
        name="setupSecret"
        render={({ field, fieldState }) => (
          <TextField
            name={field.name}
            value={field.value}
            onBlur={field.onBlur}
            inputRef={field.ref}
            label={copy.emailSetupSecret}
            type="password"
            onChange={(event) => {
              field.onChange(event);
              onValueChange();
            }}
            autoComplete="off"
            spellCheck={false}
            required
            fullWidth
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message}
            slotProps={{ htmlInput: { minLength: 32 } }}
          />
        )}
      />
    </Box>
  );
}
