import { Button } from "@mui/material";
import { useAuth } from "@/features/auth";
import type { SetupCopy as Copy } from "../../../../locales";

interface WorkspaceStepProps {
  copy: Copy;
  complete: boolean;
}

export function WorkspaceStep(props: WorkspaceStepProps) {
  const { copy, complete } = props;
  const { reauthenticate } = useAuth();

  return complete ? (
    <Button
      variant="contained"
      sx={{ alignSelf: "flex-start" }}
      onClick={() => void reauthenticate()}
    >
      {copy.enterWorkspace}
    </Button>
  ) : (
    <Button
      variant="contained"
      component="a"
      href="/"
      sx={{ alignSelf: "flex-start" }}
    >
      {copy.openWorkspace}
    </Button>
  );
}
