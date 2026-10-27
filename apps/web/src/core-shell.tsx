import type { ReactNode } from "react";
import type Keycloak from "keycloak-js";
import {
  Box,
  Button,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { BrandLogo } from "./brand-logo";

export type CoreLocale = "en" | "el";

export function CoreShell({
  children,
  keycloak,
  locale,
  onLocaleChange,
  sectionLabel,
  signOutLabel,
}: {
  children: ReactNode;
  keycloak: Keycloak;
  locale: CoreLocale;
  onLocaleChange: (locale: CoreLocale) => void;
  sectionLabel: string;
  signOutLabel: string;
}) {
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
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {sectionLabel}
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
          <Box
            sx={{
              display: { xs: "block", md: "none" },
              flexShrink: 0,
              "& .MuiTypography-root": { display: { xs: "none", sm: "block" } },
            }}
          >
            <BrandLogo />
          </Box>
          <Typography
            sx={{
              display: { xs: "none", md: "block" },
              fontFamily: "Manrope, Inter, sans-serif",
              fontWeight: 700,
            }}
          >
            {sectionLabel}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={locale}
              onChange={(_, value: CoreLocale | null) =>
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
            <Button
              color="inherit"
              size="small"
              onClick={() =>
                void keycloak.logout({ redirectUri: window.location.origin })
              }
            >
              {signOutLabel}
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
          {children}
        </Box>
      </Box>
    </Box>
  );
}
