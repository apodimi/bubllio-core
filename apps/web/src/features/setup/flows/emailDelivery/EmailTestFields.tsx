import { Box } from "@mui/material";
import type { Control } from "react-hook-form";

import type { EmailSettingsValues } from "../../schemas/emailDeliveryForm.schema";
import type { SetupCopy } from "../../../../../locales";
import { SettingsTextField } from "./SettingsTextField";

interface EmailTestFieldsProps {
  control: Control<EmailSettingsValues>;
  copy: SetupCopy;
  onValueChange: () => void;
}

export function EmailTestFields(props: EmailTestFieldsProps) {
  const { control, copy, onValueChange } = props;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 2,
      }}
    >
      <SettingsTextField
        control={control}
        name="testRecipient"
        label={copy.emailTestRecipient}
        type="email"
        autoComplete="email"
        required
        onValueChange={onValueChange}
      />
      <SettingsTextField
        control={control}
        name="setupSecret"
        label={copy.emailSetupSecret}
        type="password"
        autoComplete="off"
        spellCheck={false}
        required
        slotProps={{ htmlInput: { minLength: 32 } }}
        onValueChange={onValueChange}
      />
    </Box>
  );
}
