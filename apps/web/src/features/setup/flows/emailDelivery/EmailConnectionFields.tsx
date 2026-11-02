import { Box, MenuItem } from "@mui/material";
import type { Control } from "react-hook-form";

import type { EmailSettingsValues } from "../../schemas/emailDeliveryForm.schema";
import type { SetupCopy } from "../../../../../locales";
import { SettingsTextField } from "./SettingsTextField";

interface EmailConnectionFieldsProps {
  control: Control<EmailSettingsValues>;
  copy: SetupCopy;
  onValueChange: () => void;
}

export function EmailConnectionFields(props: EmailConnectionFieldsProps) {
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
        name="senderName"
        label={copy.emailSenderName}
        required
        slotProps={{ htmlInput: { maxLength: 80 } }}
        onValueChange={onValueChange}
      />
      <SettingsTextField
        control={control}
        name="senderEmail"
        label={copy.emailSenderEmail}
        type="email"
        autoComplete="email"
        required
        onValueChange={onValueChange}
      />
      <SettingsTextField
        control={control}
        name="host"
        label={copy.emailHost}
        autoComplete="off"
        spellCheck={false}
        required
        onValueChange={onValueChange}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(88px, .7fr) minmax(0, 1.3fr)",
          gap: 2,
        }}
      >
        <SettingsTextField
          control={control}
          name="port"
          label={copy.emailPort}
          type="number"
          required
          slotProps={{
            htmlInput: { min: 1, max: 65_535, inputMode: "numeric" },
          }}
          onValueChange={onValueChange}
        />
        <SettingsTextField
          control={control}
          name="security"
          select
          label={copy.emailSecurity}
          onValueChange={onValueChange}
        >
          <MenuItem value="starttls">{copy.emailSecurityStarttls}</MenuItem>
          <MenuItem value="tls">{copy.emailSecurityTls}</MenuItem>
          <MenuItem value="none">{copy.emailSecurityNone}</MenuItem>
        </SettingsTextField>
      </Box>
    </Box>
  );
}
