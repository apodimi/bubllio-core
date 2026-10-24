import { Box, Typography } from "@mui/material";

interface SetupProgressProps {
  activeStage: number;
  labels: readonly string[];
  progressLabel: string;
  statusLabels: {
    complete: string;
    current: string;
    upcoming: string;
  };
}

/** A read-only journey: setup state, never a shortcut around required steps. */
export function SetupProgress({
  activeStage,
  labels,
  progressLabel,
  statusLabels,
}: SetupProgressProps) {
  return (
    <Box component="nav" aria-label={progressLabel}>
      <Box
        component="ol"
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(4, minmax(0, 1fr))",
          },
          gap: { xs: 0, sm: 1 },
          listStyle: "none",
          p: 0,
          m: 0,
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {labels.map((label, index) => {
          const complete = activeStage > index;
          const current = activeStage === index;
          const status = complete
            ? statusLabels.complete
            : current
              ? statusLabels.current
              : statusLabels.upcoming;

          return (
            <Box
              component="li"
              key={label}
              aria-current={current ? "step" : undefined}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                minWidth: 0,
                py: { xs: 2, sm: 2.25 },
                px: { xs: 1, sm: 1.5 },
                borderTop: "3px solid",
                borderTopColor: current ? "primary.main" : "transparent",
                minHeight: { xs: 86, sm: 0 },
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 32,
                  height: 32,
                  flex: "0 0 32px",
                  borderRadius: "8px",
                  bgcolor: current
                    ? "primary.main"
                    : complete
                      ? "action.selected"
                      : "background.default",
                  color: current
                    ? "primary.contrastText"
                    : complete
                      ? "primary.main"
                      : "text.secondary",
                  fontSize: ".75rem",
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: current ? 700 : 600,
                    color:
                      current || complete ? "text.primary" : "text.secondary",
                    lineHeight: 1.3,
                  }}
                >
                  {label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {status}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
