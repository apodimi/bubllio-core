import { Box, Button, Collapse, Stack } from "@mui/material";
import type { Control } from "react-hook-form";

import type { EmailSettingsValues } from "../../schemas/emailDeliveryForm.schema";
import type { SetupCopy } from "../../../../../locales";
import { SettingsTextField } from "./SettingsTextField";

interface EmailAdvancedSettingsProps {
  advanced: boolean;
  control: Control<EmailSettingsValues>;
  copy: SetupCopy;
  onToggle: () => void;
  onValueChange: () => void;
}

export function EmailAdvancedSettings(props: EmailAdvancedSettingsProps) {
  const { advanced, control, copy, onToggle, onValueChange } = props;

  return (
    <Stack spacing={2.5}>
      <Button
        type="button"
        variant="text"
        sx={{ alignSelf: "flex-start" }}
        aria-expanded={advanced}
        aria-controls="email-advanced-settings"
        onClick={onToggle}
      >
        {advanced ? copy.emailAdvancedHide : copy.emailAdvancedShow}
      </Button>
      <Collapse id="email-advanced-settings" in={advanced}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
            pt: 0.5,
          }}
        >
          <SettingsTextField
            control={control}
            name="replyToEmail"
            label={copy.emailReplyTo}
            type="email"
            autoComplete="email"
            onValueChange={onValueChange}
          />
        </Box>
      </Collapse>
    </Stack>
  );
}
