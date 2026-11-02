import { Box, Card, CardActionArea, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { buildApplicationLaunchUrl } from "../buildApplicationLaunchUrl";
import type { WorkspaceApplication } from "../schemas/workspace.schema";

interface WorkspaceApplicationCardProps {
  application: WorkspaceApplication;
  organizationId: string;
}

export function WorkspaceApplicationCard(props: WorkspaceApplicationCardProps) {
  const { application, organizationId } = props;
  const { t } = useTranslation("translation", { keyPrefix: "workspace" });
  const launchUrl = buildApplicationLaunchUrl(
    application.launchUrl,
    organizationId,
    import.meta.env.DEV,
  );
  const actionLabel = launchUrl ? t("open") : t("unavailable");
  const initial = application.displayName.slice(0, 1).toUpperCase();

  return (
    <Box component="li">
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardActionArea
          component={launchUrl ? "a" : "div"}
          href={launchUrl}
          disabled={!launchUrl}
          aria-label={`${application.displayName} ${actionLabel}`}
          sx={{
            minHeight: 176,
            p: 2.5,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "space-between",
            textAlign: "left",
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              display: "grid",
              placeItems: "center",
              borderRadius: 1,
              bgcolor: "primary.light",
              color: "primary.main",
              fontFamily: "Manrope, Inter, sans-serif",
              fontWeight: 700,
              fontSize: "1.25rem",
            }}
          >
            {initial}
          </Box>
          <Box>
            <Typography variant="h6">{application.displayName}</Typography>
            <Typography
              variant="body2"
              color={launchUrl ? "primary.main" : "text.secondary"}
              sx={{ mt: 0.75, fontWeight: 600 }}
            >
              {actionLabel}
            </Typography>
          </Box>
        </CardActionArea>
      </Card>
    </Box>
  );
}
