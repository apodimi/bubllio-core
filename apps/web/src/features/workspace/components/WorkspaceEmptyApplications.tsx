import { Box, Button, Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

interface WorkspaceEmptyApplicationsProps {
  manageAccessUrl?: string;
}

export function WorkspaceEmptyApplications(
  props: WorkspaceEmptyApplicationsProps,
) {
  const { manageAccessUrl } = props;
  const { t } = useTranslation("translation", { keyPrefix: "workspace" });

  return (
    <Paper variant="outlined" sx={{ maxWidth: 640, p: { xs: 3, md: 4 } }}>
      <Typography variant="h5" component="h2">
        {t("emptyAppsTitle")}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {t(manageAccessUrl ? "emptyAppsAdmin" : "emptyApps")}
      </Typography>
      {manageAccessUrl && (
        <Box sx={{ mt: 3 }}>
          <Button component={Link} to={manageAccessUrl} variant="contained">
            {t("manageAccess")}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
