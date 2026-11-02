import { Button, CircularProgress } from "@mui/material";

interface SubmitButtonProps {
  busy: boolean;
  idleLabel: string;
  busyLabel: string;
}

export function SubmitButton(props: SubmitButtonProps) {
  const { busy, idleLabel, busyLabel } = props;

  return (
    <Button
      type="submit"
      variant="contained"
      disabled={busy}
      startIcon={
        busy ? <CircularProgress size={18} color="inherit" /> : undefined
      }
      sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}
    >
      {busy ? busyLabel : idleLabel}
    </Button>
  );
}
