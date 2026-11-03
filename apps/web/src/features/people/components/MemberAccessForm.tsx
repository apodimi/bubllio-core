import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { useSaveMemberAccess } from "../hooks/usePeople";
import type { CatalogApp, Member } from "../schemas/people.schema";
import { AppAccessChoices } from "./AppAccessChoices";

interface MemberAccessFormProps {
  member: Member;
  apps: CatalogApp[];
  organizationId: string;
  subject: string | undefined;
  onClose: () => void;
}

export function MemberAccessForm(props: MemberAccessFormProps) {
  const { member, apps, organizationId, subject, onClose } = props;
  const { t } = useTranslation("translation", { keyPrefix: "people" });
  const { mutateAsync, isPending } = useSaveMemberAccess(
    subject,
    organizationId,
  );
  const [role, setRole] = useState(member.role);
  const [applicationKeys, setApplicationKeys] = useState(
    member.applicationKeys,
  );
  const [failed, setFailed] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const displayedApps = [
    ...apps,
    ...member.applicationKeys
      .filter((key) => !apps.some((app) => app.key === key))
      .map((key) => ({
        key,
        displayName: key,
        launchUrl: "",
        selectable: false,
      })),
  ];
  const hasUnavailableSelection = applicationKeys.some(
    (key) => !apps.some((app) => app.key === key && app.selectable),
  );

  async function save() {
    try {
      await mutateAsync({
        memberSubject: member.subject,
        input: { role, applicationKeys },
      });
      onClose();
    } catch {
      setFailed(true);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (member.applicationKeys.some((key) => !applicationKeys.includes(key))) {
      setConfirmRemoval(true);

      return;
    }
    void save();
  }

  return (
    <Stack component="form" spacing={2} onSubmit={submit}>
      <Typography variant="h3" component="h3">
        {t("editAccess")}: {member.email ?? member.subject}
      </Typography>
      {failed && (
        <Alert severity="error" role="alert">
          {t("saveFailed")}
        </Alert>
      )}
      {hasUnavailableSelection && (
        <Alert severity="warning">{t("removeUnavailable")}</Alert>
      )}
      {member.role !== "OWNER" && (
        <TextField
          label={t("role")}
          select
          value={role}
          onChange={(event) =>
            setRole(event.target.value as "ADMIN" | "MEMBER")
          }
        >
          <MenuItem value="MEMBER">{t("member")}</MenuItem>
          <MenuItem value="ADMIN">{t("admin")}</MenuItem>
        </TextField>
      )}
      <AppAccessChoices
        apps={displayedApps}
        selected={applicationKeys}
        onChange={setApplicationKeys}
        label={t("applications")}
        emptyLabel={t("noAppsAvailable")}
        unavailableLabel={t("appUnavailable")}
      />
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          type="submit"
          disabled={isPending || hasUnavailableSelection}
        >
          {isPending ? t("saving") : t("save")}
        </Button>
        <Button type="button" onClick={onClose} disabled={isPending}>
          {t("cancel")}
        </Button>
      </Stack>
      <Dialog open={confirmRemoval} onClose={() => setConfirmRemoval(false)}>
        <DialogTitle>{t("removeAccessTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("removeAccessBody")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemoval(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={isPending}
            onClick={() => {
              setConfirmRemoval(false);
              void save();
            }}
          >
            {t("confirmRemoval")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
