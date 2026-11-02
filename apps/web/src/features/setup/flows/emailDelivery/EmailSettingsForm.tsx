import { useEffect, useRef, useState } from "react";
import { Alert, Stack, Typography } from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors } from "react-hook-form";

import type { SetupCopy } from "../../../../../locales";
import { useEmailDeliveryStatus, useTestEmailDelivery } from "../../hooks";
import {
  emailSettingsSchema,
  type EmailSettingsValues,
} from "../../schemas/emailDeliveryForm.schema";
import { buildEmailDeliverySettings } from "./buildEmailDeliverySettings";
import { EmailAdvancedSettings } from "./EmailAdvancedSettings";
import { EmailAuthenticationFields } from "./EmailAuthenticationFields";
import { EmailConnectionFields } from "./EmailConnectionFields";
import { EmailTestFields } from "./EmailTestFields";
import { SubmitButton } from "../../components/SubmitButton";
import { emailErrorMessage, errorCodeFrom } from "./emailErrorMessage";

interface EmailSettingsFormProps {
  copy: SetupCopy;
  initialValues: EmailSettingsValues;
  statusError: string;
  refetchStatus: ReturnType<typeof useEmailDeliveryStatus>["refetch"];
  onTested: (values: EmailSettingsValues, maskedRecipient: string) => void;
}

export function EmailSettingsForm(props: EmailSettingsFormProps) {
  const { copy, initialValues, statusError, refetchStatus, onTested } = props;
  const [advanced, setAdvanced] = useState(false);
  const [errorCode, setErrorCode] = useState("");
  const resultHeading = useRef<HTMLSpanElement>(null);
  const { isPending: testPending, mutateAsync: testEmail } =
    useTestEmailDelivery();
  const {
    control,
    handleSubmit,
    setFocus,
    resetField,
    clearErrors,
    watch,
    formState: { isSubmitting },
  } = useForm<EmailSettingsValues>({
    resolver: zodResolver(emailSettingsSchema(copy)),
    defaultValues: initialValues,
  });
  const authentication = watch("authentication");
  const security = watch("security");
  const busy = isSubmitting || testPending;
  const displayedErrorCode = errorCode || statusError;
  const errorMessage = displayedErrorCode
    ? emailErrorMessage(displayedErrorCode, copy)
    : "";

  useEffect(() => {
    if (errorCode) {
      resultHeading.current?.focus();
    }
  }, [errorCode]);

  async function submit(values: EmailSettingsValues) {
    setErrorCode("");
    try {
      const result = await testEmail({
        settings: buildEmailDeliverySettings(values),
        setupSecret: values.setupSecret,
        idempotencyKey: crypto.randomUUID(),
      });
      onTested(
        { ...values, password: "", setupSecret: "" },
        result.maskedRecipient,
      );
    } catch (error) {
      const refreshed = await refetchStatus();
      setErrorCode(
        refreshed.data?.status === "attention"
          ? refreshed.data.safeErrorCode
          : errorCodeFrom(error),
      );
    } finally {
      resetField("password");
      resetField("setupSecret");
    }
  }

  function handleAuthenticationChange(checked: boolean) {
    if (!checked) {
      resetField("username");
      resetField("password");
      clearErrors(["username", "password"]);
    }
    setErrorCode("");
  }

  function handleInvalid(errors: FieldErrors<EmailSettingsValues>) {
    if (errors.replyToEmail && !advanced) {
      setAdvanced(true);
      requestAnimationFrame(() => setFocus("replyToEmail"));
    }
  }

  function clearError() {
    setErrorCode("");
  }

  function toggleAdvanced() {
    setAdvanced(!advanced);
  }

  return (
    <Stack
      component="form"
      spacing={2.5}
      onSubmit={handleSubmit(submit, handleInvalid)}
      aria-busy={busy}
      noValidate
    >
      {errorMessage && (
        <Alert severity="error" role="alert">
          <Typography ref={resultHeading} tabIndex={-1} component="span">
            {errorMessage}
          </Typography>
        </Alert>
      )}
      <EmailConnectionFields
        control={control}
        copy={copy}
        onValueChange={clearError}
      />
      {security === "none" && (
        <Alert severity="warning">{copy.emailInsecureWarning}</Alert>
      )}
      <EmailAuthenticationFields
        authentication={authentication}
        control={control}
        copy={copy}
        onAuthenticationChange={handleAuthenticationChange}
        onValueChange={clearError}
      />
      <EmailAdvancedSettings
        advanced={advanced}
        control={control}
        copy={copy}
        onToggle={toggleAdvanced}
        onValueChange={clearError}
      />
      <EmailTestFields
        control={control}
        copy={copy}
        onValueChange={clearError}
      />
      <SubmitButton
        busy={busy}
        busyLabel={copy.emailSendingTest}
        idleLabel={copy.emailSendTest}
      />
    </Stack>
  );
}
