import { Box, Button, Divider, Stack, Typography } from "@mui/material";

import { BrandLogo, LanguageSwitcher } from "@/components";
import { useAuth } from "@/features/auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
  sectionLabel: string;
  signOutLabel: string;
}

export function DashboardLayout(props: DashboardLayoutProps) {
  const { children, sectionLabel, signOutLabel } = props;
  const { signOut } = useAuth();

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
