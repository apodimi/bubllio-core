import { useEffect, useRef } from "react";
import {
  Box,
  Button,
  Container,
  Fade,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { BrandLogo, LanguageSwitcher } from "@/components";
import { useAuth } from "@/features/auth";

interface MainLayoutProps {
  title: string;
  body: string;
  viewKey: string;
  welcome: boolean;
  signOutLabel: string;
  children: React.ReactNode;
}

export function MainLayout(props: MainLayoutProps) {
  const { title, body, viewKey, welcome, signOutLabel, children } = props;
  const { authenticated, signOut } = useAuth();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousViewKey = useRef(viewKey);

  useEffect(() => {
    if (previousViewKey.current !== viewKey) {
      headingRef.current?.focus();
    }
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
              <Fade in appear={welcome}>
                <Box>
                  <BrandLogo />
                </Box>
              </Fade>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <LanguageSwitcher />
                {authenticated && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => void signOut(true)}
                  >
                    {signOutLabel}
                  </Button>
                )}
              </Stack>
            </Stack>
            <Box sx={{ pt: { xs: 1, sm: 2 } }}>
              <Fade in appear={welcome} style={{ transitionDelay: "60ms" }}>
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
              </Fade>
              <Fade in appear={welcome} style={{ transitionDelay: "120ms" }}>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 1.5, lineHeight: 1.65, maxWidth: "70ch" }}
                >
                  {body}
                </Typography>
              </Fade>
            </Box>
            {children}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
