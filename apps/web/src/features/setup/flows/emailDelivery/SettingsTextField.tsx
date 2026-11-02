import { TextField, type TextFieldProps } from "@mui/material";
import { Controller, type Control } from "react-hook-form";

import type { EmailSettingsValues } from "../../schemas/emailDeliveryForm.schema";

type SettingsField = Exclude<keyof EmailSettingsValues, "authentication">;

type SettingsTextFieldProps = {
  control: Control<EmailSettingsValues>;
  name: SettingsField;
  onValueChange: () => void;
} & Omit<
  TextFieldProps,
  "name" | "value" | "onChange" | "error" | "helperText"
>;

export function SettingsTextField(props: SettingsTextFieldProps) {
  const { control, name, onValueChange, ...textFieldProps } = props;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...textFieldProps}
          name={field.name}
          value={field.value}
          onBlur={field.onBlur}
          inputRef={field.ref}
          onChange={(event) => {
            field.onChange(event);
            onValueChange();
          }}
          fullWidth
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message}
        />
      )}
    />
  );
}
