import type { ReactNode } from "react";
import { Box } from "@mui/material";

import {
  AccountStep,
  OperationStep,
  OrganizationStep,
  WorkspaceStep,
} from "../steps";
import type { TaskKey } from "./SetupTask";
import type { useSetupFlow } from "./setupFlow/useSetupFlow";

interface SetupTaskContentProps {
  task: TaskKey;
  flow: ReturnType<typeof useSetupFlow>;
}

export function SetupTaskContent(props: SetupTaskContentProps) {
  const { task, flow } = props;
  const content = taskContent(task, flow);

  if (!content) {
    return null;
  }

  return <Box sx={{ mt: 2.5 }}>{content}</Box>;
}

function taskContent(
  task: TaskKey,
  flow: ReturnType<typeof useSetupFlow>,
): ReactNode {
  const { state, copy } = flow;

  if (task === "authority" && state.step === "secret") {
    return (
      <AccountStep
        step="secret"
        copy={copy}
        secret={state.secret}
        busy={state.busy}
        onSecretChange={flow.setSecret}
        onClaim={flow.submitClaim}
      />
    );
  }
  if (task === "organization" && state.step === "organization") {
    return (
      <OrganizationStep
        copy={copy}
        value={state.organizationName}
        busy={state.busy}
        onChange={flow.setOrganizationName}
        onSubmit={flow.submitOrganization}
      />
    );
  }
  if (task === "activation" && state.step === "progress" && state.operation) {
    return (
      <OperationStep
        copy={copy}
        operation={state.operation}
        busy={state.busy}
        retryFeedback={state.retryFeedback}
        onRetry={flow.submitRetry}
      />
    );
  }
  if (
    task === "activation" &&
    (state.step === "done" || state.step === "closed")
  ) {
    return <WorkspaceStep copy={copy} complete={state.step === "done"} />;
  }

  return null;
}
