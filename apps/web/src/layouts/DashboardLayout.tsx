import { useState } from "react";
import { Box, Button, Drawer, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { BrandLogo, LanguageSwitcher } from "@/components";
import { useAuth } from "@/features/auth";
import {
  DashboardNavigation,
  type DashboardNavigationContext,
  type DashboardNavigationGroup,
} from "./DashboardNavigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
  navigation?: {
    context?: DashboardNavigationContext;
    groups: DashboardNavigationGroup[];
  };
  sectionLabel: string;
  signOutLabel: string;
}

export function DashboardLayout(props: DashboardLayoutProps) {
  const { children, navigation, sectionLabel, signOutLabel } = props;
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasNavigation = Boolean(navigation?.groups.length);

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
          position: "sticky",
          top: 0,
          height: "100dvh",
          overflowY: "auto",
        }}
      >
        {navigation && hasNavigation ? (
          <DashboardNavigation
            context={navigation.context}
            groups={navigation.groups}
            navigationLabel={t("navigation.primary")}
          />
        ) : (
          <>
            <BrandLogo />
            <Typography sx={{ mt: 5, px: 1.5, fontWeight: 700 }}>
              {sectionLabel}
            </Typography>
          </>
        )}
      </Box>
      {navigation && hasNavigation && (
        <Drawer
          variant="temporary"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          sx={{ display: { xs: "block", md: "none" } }}
          slotProps={{
            paper: { sx: { width: 288, maxWidth: "85vw", p: 2.5 } },
          }}
        >
          <DashboardNavigation
            context={navigation.context}
            groups={navigation.groups}
            navigationLabel={t("navigation.primary")}
            closeLabel={t("navigation.close")}
            onNavigate={() => setMenuOpen(false)}
          />
        </Drawer>
      )}
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
          <Stack
            direction="row"
            spacing={1}
            sx={{ display: { xs: "flex", md: "none" }, alignItems: "center" }}
          >
            {hasNavigation && (
              <Button
                color="inherit"
                size="small"
                aria-label={t("navigation.open")}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                sx={{ minWidth: 0, px: 1 }}
              >
                {t("navigation.menu")}
              </Button>
            )}
            <Box
              sx={{
                "& .MuiTypography-root": {
                  display: { xs: "none", sm: "block" },
                },
              }}
            >
              <BrandLogo />
            </Box>
          </Stack>
          <Typography
            sx={{
              display: { xs: "none", md: hasNavigation ? "none" : "block" },
              fontFamily: "Manrope, Inter, sans-serif",
              fontWeight: 700,
            }}
          >
            {sectionLabel}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", ml: "auto" }}
          >
            <LanguageSwitcher />
            <Button color="inherit" size="small" onClick={() => void signOut()}>
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
