import { Box, LinearProgress, Typography } from "@mui/material";

interface SetupProgressProps {
  activeStage: number;
  labels: readonly string[];
  progressLabel: string;
  statusLabels: {
    complete: string;
    current: string;
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
      <Box sx={{ py: 1 }}>
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
