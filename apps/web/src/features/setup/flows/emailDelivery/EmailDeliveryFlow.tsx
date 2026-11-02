import { useState } from "react";
import { LoadingStatus, RetryAlert } from "@/components";

import { useEmailDeliveryStatus } from "../../hooks";
import { initialEmailSettingsValues } from "../../schemas/emailDeliveryForm.schema";
import { EmailSettingsForm } from "./EmailSettingsForm";
import { EmailConfirmationForm } from "./EmailConfirmationForm";
import type { SetupCopy } from "../../../../../locales";

interface EmailDeliveryFlowProps {
  copy: SetupCopy;
}

export function EmailDeliveryFlow(props: EmailDeliveryFlowProps) {
  const { copy } = props;
  const {
    data: status,
    isError,
    isPending,
    refetch,
  } = useEmailDeliveryStatus();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialEmailSettingsValues);
  const [maskedRecipient, setMaskedRecipient] = useState<string>();
  const waiting =
    !editing &&
    (status?.status === "awaiting_confirmation" ||
      (status?.status === "attention" && status.confirmationRetryable));

  if (isPending) {
    return <LoadingStatus label={copy.emailLoading} />;
  }
  if (isError) {
    return (
      <RetryAlert
        message={copy.emailUnavailable}
        retryLabel={copy.tryAgain}
        onRetry={() => void refetch()}
      />
    );
  }

  const statusError =
    status?.status === "attention" || status?.status === "awaiting_confirmation"
      ? (status.safeErrorCode ?? "")
      : "";
  if (waiting) {
    return (
      <EmailConfirmationForm
        copy={copy}
        maskedRecipient={maskedRecipient ?? copy.emailRecipientHidden}
        statusError={statusError}
        refetchStatus={refetch}
        onSendAgain={() => setEditing(true)}
      />
    );
  }

  return (
    <EmailSettingsForm
      copy={copy}
      initialValues={draft}
      statusError={statusError}
      refetchStatus={refetch}
      onTested={(values, recipient) => {
        setDraft(values);
        setMaskedRecipient(recipient);
        setEditing(false);
      }}
    />
  );
}
