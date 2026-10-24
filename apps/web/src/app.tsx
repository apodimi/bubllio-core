import { useEffect, useState } from "react";
import type Keycloak from "keycloak-js";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  NativeSelect,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { BrandLogo } from "./brand-logo";
import {
  useWorkspaceApplications,
  useWorkspaceOrganizations,
} from "./workspace-queries";
import { workspaceCopy, type Locale } from "./workspace-copy";

export function App({ keycloak }: { keycloak: Keycloak }) {
  const [locale, setLocale] = useState<Locale>(() =>
    navigator.language.startsWith("el") ? "el" : "en",
  );
  const [organizationId, setOrganizationId] = useState("");
  const organizationsQuery = useWorkspaceOrganizations(keycloak);
  const applicationsQuery = useWorkspaceApplications(keycloak, organizationId);
  const organizations = organizationsQuery.data;
  const applications = applicationsQuery.data;
  const copy = workspaceCopy[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    if (!organizations) return;
    setOrganizationId((current) =>
      organizations.some(({ id }) => id === current)
        ? current
        : (organizations[0]?.id ?? ""),
    );
  }, [organizations]);

  const error = organizationsQuery.error ?? applicationsQuery.error;
  const loading =
    organizationsQuery.isPending ||
    (Boolean(organizationId) && applicationsQuery.isPending);
  const sessionExpired =
    error instanceof Error && error.message === "SESSION_EXPIRED";

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        bgcolor: "background.default",
      }}
    >
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          width: 248,
          flexShrink: 0,
          bgcolor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
          px: 2,
          py: 3,
        }}
      >
        <BrandLogo />
        <Divider sx={{ my: 3 }} />
        <Box
          sx={{
            py: 1.5,
            px: 2,
            bgcolor: "action.selected",
            color: "primary.main",
            borderLeft: "2px solid",
            borderColor: "primary.main",
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {copy.workspace}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          component="header"
          sx={{
            minHeight: { xs: 64, md: 80 },
            px: { xs: 2, sm: 3, lg: 4.5 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            <BrandLogo />
          </Box>
          <Typography
            sx={{
              display: { xs: "none", md: "block" },
              fontFamily: "Manrope, Inter, sans-serif",
              fontWeight: 700,
            }}
          >
            {copy.workspace}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={locale}
              onChange={(_, value: Locale | null) => value && setLocale(value)}
              aria-label="Language"
            >
              <ToggleButton value="el" aria-label="Ελληνικά">
                ΕΛ
              </ToggleButton>
              <ToggleButton value="en" aria-label="English">
                EN
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              color="inherit"
              size="small"
              onClick={() =>
                void keycloak.logout({ redirectUri: window.location.origin })
              }
            >
              {copy.signOut}
            </Button>
          </Stack>
        </Box>
        <Box
          component="main"
          sx={{
            maxWidth: 1600,
            mx: "auto",
            px: { xs: 2, sm: 3, lg: 4.5 },
            pt: { xs: 3, md: 5 },
            pb: 8,
          }}
        >
          <Typography variant="h1" component="h1">
            {copy.applications}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {copy.subtitle}
          </Typography>
          {organizations && organizations.length > 0 && (
            <FormControl
              size="small"
              sx={{ mt: 4, minWidth: { xs: "100%", sm: 320 } }}
            >
              <InputLabel id="organization-label">
                {copy.chooseOrganization}
              </InputLabel>
              <NativeSelect
                id="organization-select"
                value={organizationId}
                inputProps={{ "aria-labelledby": "organization-label" }}
                onChange={(event) => setOrganizationId(event.target.value)}
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.displayName}
                  </option>
                ))}
              </NativeSelect>
            </FormControl>
          )}
          <Box sx={{ mt: 4 }}>
            {error ? (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      void (organizationsQuery.isError
                        ? organizationsQuery.refetch()
                        : applicationsQuery.refetch())
                    }
                  >
                    {copy.retry}
                  </Button>
                }
              >
                {sessionExpired ? copy.sessionExpired : copy.error}
              </Alert>
            ) : loading ? (
              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: "center" }}
                role="status"
              >
                <CircularProgress size={20} />
                <Typography color="text.secondary">{copy.loading}</Typography>
              </Stack>
            ) : organizations?.length === 0 ? (
              <Alert severity="info">
                <Typography variant="h6">{copy.emptyOrganizations}</Typography>
                <Typography variant="body2">
                  {copy.emptyOrganizationsHelp}
                </Typography>
              </Alert>
            ) : applications?.length === 0 ? (
              <Alert severity="info">{copy.emptyApps}</Alert>
            ) : (
              <Box
                component="ul"
                aria-label={copy.applications}
                sx={{
                  listStyle: "none",
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                  gap: 3,
                  p: 0,
                  m: 0,
                }}
              >
                {applications?.map((application) => {
                  const launchUrl = safeLaunchUrl(
                    application.launchUrl,
                    organizationId,
                  );
                  return (
                    <Box component="li" key={application.key}>
                      <Card variant="outlined" sx={{ height: "100%" }}>
                        <CardActionArea
                          component={launchUrl ? "a" : "div"}
                          href={launchUrl}
                          disabled={!launchUrl}
                          aria-label={`${application.displayName} ${launchUrl ? copy.open : copy.unavailable}`}
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
                            {application.displayName.slice(0, 1).toUpperCase()}
                          </Box>
                          <Box>
                            <Typography variant="h6">
                              {application.displayName}
                            </Typography>
                            <Typography
                              variant="body2"
                              color={
                                launchUrl ? "primary.main" : "text.secondary"
                              }
                              sx={{ mt: 0.75, fontWeight: 600 }}
                            >
                              {launchUrl ? copy.open : copy.unavailable}
                            </Typography>
                          </Box>
                        </CardActionArea>
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function safeLaunchUrl(
  value: string,
  organizationId: string,
): string | undefined {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" ||
      (import.meta.env.DEV &&
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname))
    ) {
      url.searchParams.set("organization_id", organizationId);
      return url.href;
    }
  } catch {
    // An invalid catalog URL cannot become a navigation target.
  }
  return undefined;
}
