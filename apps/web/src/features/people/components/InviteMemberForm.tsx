import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { useSendInvitation } from "../hooks/usePeople";
import {
  invitationInputSchema,
  type CatalogApp,
} from "../schemas/people.schema";
import { AppAccessChoices } from "./AppAccessChoices";

interface InviteMemberFormProps {
  organizationId: string;
  subject: string | undefined;
  apps: CatalogApp[];
}

export function InviteMemberForm(props: InviteMemberFormProps) {
  const { organizationId, subject, apps } = props;
  const { t } = useTranslation("translation", { keyPrefix: "people" });
  const { mutateAsync, isPending } = useSendInvitation(subject, organizationId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [applicationKeys, setApplicationKeys] = useState<string[]>([]);
  const [message, setMessage] = useState<"sent" | "invalid" | "failed" | "">(
    "",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = invitationInputSchema.safeParse({
      email: email.trim(),
      role,
      applicationKeys,
    });
    if (!input.success) {
      setMessage("invalid");

      return;
    }

    try {
      await mutateAsync(input.data);
      setEmail("");
      setRole("MEMBER");
      setApplicationKeys([]);
      setMessage("sent");
    } catch {
      setMessage("failed");
    }
  }

  return (
    <Stack
      component="form"
      spacing={2}
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <Typography variant="h2" component="h2">
        {t("inviteTitle")}
      </Typography>
      <Typography color="text.secondary">{t("inviteHelp")}</Typography>
      {message && (
        <Alert
          severity={message === "sent" ? "success" : "error"}
          role="status"
        >
          {t(message)}
        </Alert>
      )}
      <TextField
        label={t("email")}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setMessage("");
        }}
      />
      <TextField
        label={t("role")}
        select
        value={role}
        onChange={(event) => setRole(event.target.value as "ADMIN" | "MEMBER")}
      >
        <MenuItem value="MEMBER">{t("member")}</MenuItem>
        <MenuItem value="ADMIN">{t("admin")}</MenuItem>
      </TextField>
      <AppAccessChoices
        apps={apps}
        selected={applicationKeys}
        onChange={setApplicationKeys}
        label={t("applications")}
        emptyLabel={t("noAppsAvailable")}
        unavailableLabel={t("appUnavailable")}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={isPending}
        sx={{ alignSelf: "flex-start" }}
      >
        {isPending ? t("sending") : t("sendInvitation")}
      </Button>
    </Stack>
  );
}
