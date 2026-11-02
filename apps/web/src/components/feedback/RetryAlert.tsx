import { Alert, Button } from "@mui/material";

interface RetryAlertProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  smallAction?: boolean;
}

export function RetryAlert(props: RetryAlertProps) {
  const { message, retryLabel, onRetry, smallAction = false } = props;

  return (
    <Alert
      severity="error"
      role="alert"
      action={
        <Button
          color="inherit"
          size={smallAction ? "small" : "medium"}
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
