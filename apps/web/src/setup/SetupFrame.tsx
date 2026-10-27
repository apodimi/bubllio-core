import { useEffect, useRef, type ReactNode } from "react";
import type Keycloak from "keycloak-js";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { BrandLogo } from "../brand-logo";
import type { SetupLocale } from "../setup-copy";

interface SetupFrameProps {
  keycloak: Keycloak;
  locale: SetupLocale;
  onLocaleChange: (locale: SetupLocale) => void;
  title: string;
  body: string;
  viewKey: string;
  signOutLabel: string;
  children: ReactNode;
}

export function SetupFrame({
  keycloak,
  locale,
  onLocaleChange,
  title,
  body,
  viewKey,
  signOutLabel,
  children,
}: SetupFrameProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousViewKey = useRef(viewKey);

  useEffect(() => {
    if (previousViewKey.current !== viewKey) headingRef.current?.focus();
    previousViewKey.current = viewKey;
  }, [viewKey]);

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        py: { xs: 2, md: 7 },
        px: 2,
        display: "grid",
        placeItems: "center",
      }}
    >
      <Container
        maxWidth={false}
        sx={{ maxWidth: "920px !important", px: "0 !important" }}
      >
        <Paper variant="outlined">
          <Stack
            spacing={3.5}
            sx={{ p: { xs: 2.5, sm: 4.5, md: 6 }, minWidth: 0 }}
          >
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <BrandLogo />
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={locale}
                  onChange={(_, value: SetupLocale | null) =>
                    value && onLocaleChange(value)
                  }
                  aria-label="Language"
                >
                  <ToggleButton value="el" aria-label="Ελληνικά">
                    ΕΛ
                  </ToggleButton>
                  <ToggleButton value="en" aria-label="English">
                    EN
                  </ToggleButton>
                </ToggleButtonGroup>
                {keycloak.authenticated && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      void keycloak.logout({
                        redirectUri: `${window.location.origin}/setup`,
                      })
                    }
                  >
                    {signOutLabel}
                  </Button>
                )}
              </Stack>
            </Stack>
            <Box sx={{ pt: { xs: 1, sm: 2 } }}>
              <Typography
                ref={headingRef}
                tabIndex={-1}
                variant="h3"
                component="h1"
                sx={{
                  maxWidth: 650,
                  fontSize: { xs: "1.85rem", sm: "2.35rem" },
                  lineHeight: 1.15,
                }}
              >
                {title}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 1.5, lineHeight: 1.65, maxWidth: "70ch" }}
              >
                {body}
              </Typography>
            </Box>
            {children}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
