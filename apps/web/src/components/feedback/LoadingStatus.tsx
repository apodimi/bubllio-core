import { CircularProgress, Stack, Typography } from "@mui/material";

interface LoadingStatusProps {
  label: string;
}

export function LoadingStatus(props: LoadingStatusProps) {
  const { label } = props;

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "center" }}
      role="status"
    >
      <CircularProgress size={20} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}
