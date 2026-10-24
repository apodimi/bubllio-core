import { Box, Stack, Typography } from "@mui/material";

import bubllioMark from "./assets/bubllio-mark.png";

/** CRM-aligned Bubllio lockup shared by Core setup and workspace. */
export function BrandLogo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Stack direction="row" sx={{ alignItems: "center", gap: 1.25 }}>
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 32,
          height: 36,
          borderRadius: 1,
          bgcolor: inverse ? "background.paper" : "transparent",
        }}
      >
        <Box
          component="img"
          src={bubllioMark}
          alt=""
          sx={{ display: "block", width: "auto", height: 30 }}
        />
      </Box>
      <Typography
        component="span"
        variant="h6"
        sx={{
          color: inverse ? "primary.contrastText" : "text.primary",
          fontWeight: 750,
          fontSize: "1.25rem",
          letterSpacing: "-0.3px",
        }}
      >
        bubllio
        <Box
          component="span"
          sx={{
            ml: 0.75,
            color: inverse ? "primary.light" : "text.secondary",
            fontSize: ".72em",
            fontWeight: 600,
          }}
        >
          / core
        </Box>
      </Typography>
    </Stack>
  );
}
