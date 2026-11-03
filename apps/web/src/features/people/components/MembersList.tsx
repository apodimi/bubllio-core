import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import type { CatalogApp, Member } from "../schemas/people.schema";
import { MemberAccessForm } from "./MemberAccessForm";

interface MembersListProps {
  members: Member[];
  apps: CatalogApp[];
  organizationId: string;
  actorRole: "OWNER" | "ADMIN";
  subject: string | undefined;
}

export function MembersList(props: MembersListProps) {
  const { members, apps, organizationId, actorRole, subject } = props;
  const { t } = useTranslation("translation", { keyPrefix: "people" });
  const [editingSubject, setEditingSubject] = useState("");

  return (
    <Box>
      <Typography variant="h2" component="h2" sx={{ mb: 2 }}>
        {t("members")}
      </Typography>
      {members.length ? (
        <Stack divider={<Divider />}>
          {members.map((member) => (
            <Box key={member.subject} sx={{ py: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { sm: "center" },
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>
                    {member.email ??
                      t(
                        member.role === "OWNER"
                          ? "ownerAccount"
                          : "memberAccount",
                      )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      member.role === "OWNER"
                        ? "owner"
                        : member.role === "ADMIN"
                          ? "admin"
                          : "member",
                    )}{" "}
                    · {t("appCount", { count: member.applicationKeys.length })}
                  </Typography>
                </Box>
                {(member.role !== "OWNER" || actorRole === "OWNER") && (
                  <Button onClick={() => setEditingSubject(member.subject)}>
                    {t("editAccess")}
                  </Button>
                )}
              </Stack>
              {editingSubject === member.subject && (
                <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                  <MemberAccessForm
                    key={`${organizationId}:${member.subject}`}
                    member={member}
                    apps={apps}
                    organizationId={organizationId}
                    subject={subject}
                    onClose={() => setEditingSubject("")}
                  />
                </Paper>
              )}
            </Box>
          ))}
        </Stack>
      ) : (
        <Alert severity="info">{t("noMembers")}</Alert>
      )}
    </Box>
  );
}
