import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { SetupCopy } from "../../../../../locales";
import { useConfirmEmailDelivery, useEmailDeliveryStatus } from "../../hooks";
import { EmailConfirmationFields } from "./EmailConfirmationFields";
import {
  emailConfirmationSchema,
  type EmailConfirmationValues,
} from "../../schemas/emailDeliveryForm.schema";
import { emailErrorMessage, errorCodeFrom } from "./emailErrorMessage";

interface EmailConfirmationFormProps {
  copy: SetupCopy;
  maskedRecipient: string;
  statusError: string;
  refetchStatus: ReturnType<typeof useEmailDeliveryStatus>["refetch"];
  onSendAgain: () => void;
}

export function EmailConfirmationForm(props: EmailConfirmationFormProps) {
  const { copy, maskedRecipient, statusError, refetchStatus, onSendAgain } =
    props;
  const { t } = useTranslation();
  const [errorCode, setErrorCode] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const { isPending: confirmationPending, mutateAsync: confirmEmail } =
    useConfirmEmailDelivery();
  const {
    control,
    handleSubmit,
    resetField,
    formState: { isSubmitting },
  } = useForm<EmailConfirmationValues>({
    resolver: zodResolver(emailConfirmationSchema(copy)),
    defaultValues: { confirmationCode: "", setupSecret: "" },
  });
  const busy = isSubmitting || confirmationPending;
  const errorMessage = errorCode
    ? emailErrorMessage(errorCode, copy)
    : statusError
      ? emailErrorMessage(statusError, copy)
      : "";

  useEffect(() => {
    if (errorCode) {
      errorRef.current?.focus();
    }
  }, [errorCode]);

  async function submit(values: EmailConfirmationValues) {
    setErrorCode("");
    try {
      await confirmEmail({
        confirmationCode: values.confirmationCode,
        setupSecret: values.setupSecret,
        idempotencyKey: crypto.randomUUID(),
      });
    } catch (error) {
      const refreshed = await refetchStatus();
      setErrorCode(
        refreshed.data?.status === "attention"
          ? refreshed.data.safeErrorCode
          : errorCodeFrom(error),
      );
    } finally {
      resetField("confirmationCode");
      resetField("setupSecret");
    }
  }

  return (
    <Stack
      component="form"
      spacing={2.5}
      onSubmit={handleSubmit(submit)}
      aria-busy={busy}
      noValidate
    >
      <Box role="status" aria-live="polite">
        <Typography variant="h5" component="h2">
          {copy.emailTestSent}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          {t("setup.emailTestSentBody", { recipient: maskedRecipient })}
        </Typography>
      </Box>
      {errorMessage && (
        <Alert ref={errorRef} tabIndex={-1} severity="error" role="alert">
          {errorMessage}
        </Alert>
      )}
      <EmailConfirmationFields
        control={control}
        copy={copy}
        onValueChange={() => setErrorCode("")}
      />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ justifyContent: "space-between" }}
      >
        <Button
          type="button"
          color="inherit"
          disabled={busy}
          onClick={onSendAgain}
        >
          {copy.emailSendAgain}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={busy}
          startIcon={
            busy ? <CircularProgress size={18} color="inherit" /> : undefined
          }
        >
          {busy ? copy.emailConfirming : copy.emailConfirm}
        </Button>
      </Stack>
    </Stack>
  );
}
