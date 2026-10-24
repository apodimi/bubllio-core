import { Box, LinearProgress, Typography } from "@mui/material";

interface SetupProgressProps {
  activeStage: number;
  labels: readonly string[];
  progressLabel: string;
  statusLabels: {
    complete: string;
    current: string;
    upcoming: string;
  };
  stepOf: (current: number, total: number) => string;
}

/** A read-only journey: setup state, never a shortcut around required steps. */
export function SetupProgress({
  activeStage,
  labels,
  progressLabel,
  statusLabels,
  stepOf,
}: SetupProgressProps) {
  const currentIndex = Math.min(activeStage, labels.length - 1);
  const completed = activeStage >= labels.length;
  const progressValue = completed
    ? 100
    : ((currentIndex + 1) / labels.length) * 100;

  return (
    <Box component="nav" aria-label={progressLabel}>
      <Box sx={{ display: { xs: "block", sm: "none" }, py: 1 }}>
        <StackLabel
          step={stepOf(currentIndex + 1, labels.length)}
          label={labels[currentIndex]}
          status={completed ? statusLabels.complete : statusLabels.current}
        />
        <LinearProgress
          variant="determinate"
          value={progressValue}
          aria-label={progressLabel}
          sx={{ mt: 1.5, height: 4, borderRadius: 2 }}
        />
      </Box>
      <Box
        component="ol"
        sx={{
          display: { xs: "none", sm: "grid" },
          gridTemplateColumns: {
            sm: `repeat(${labels.length}, minmax(0, 1fr))`,
          },
          gap: 1,
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
                py: 2.25,
                px: 1.5,
                borderTop: "3px solid",
                borderTopColor: current ? "primary.main" : "transparent",
                minHeight: 0,
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

function StackLabel({
  step,
  label,
  status,
}: {
  step: string;
  label: string;
  status: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {step}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {status}
      </Typography>
    </Box>
  );
}
