import { Alert, Box, Button, Stack, Typography } from "@mui/material";

import { DashboardLayout } from "@/layouts";
import { LoadingStatus } from "@/components";
import { EmailDeliveryFlow } from "../flows/emailDelivery/EmailDeliveryFlow";
import { SetupTask, type TaskKey, type TaskState } from "../flows/SetupTask";
import { SetupTaskContent } from "../flows/SetupTaskContent";
import type { SetupStep } from "../flows/setupFlow/setupFlow.reducer";
import { useSetupFlow } from "../flows/setupFlow/useSetupFlow";

const taskOrder: readonly TaskKey[] = [
  "authority",
  "organization",
  "activation",
];

export function SetupTasksPage() {
  const flow = useSetupFlow();
  const { copy, state } = flow;
  const taskStates = statesFor(state.step);
  const currentTask = taskOrder.find((task) => taskStates[task] === "current");

  return (
    <DashboardLayout
      sectionLabel={copy.tasksSection}
      signOutLabel={copy.signOut}
    >
      <Box
        component="section"
        aria-labelledby="setup-tasks-title"
        sx={{ maxWidth: 760 }}
      >
        <Typography id="setup-tasks-title" variant="h1" component="h1">
          {copy.tasksTitle}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: "70ch" }}>
          {copy.tasksBody}
        </Typography>

        {state.error && (
          <Alert severity="error" role="alert" sx={{ mt: 3 }}>
            {state.error}
          </Alert>
        )}

        {isLoadingStep(state.step) ? (
          <Box sx={{ mt: 4 }}>
            <LoadingStatus label={copy.loading} />
          </Box>
        ) : state.step === "email" ? (
          <Stack spacing={2.5} sx={{ mt: 4 }}>
            <Box>
              <Typography variant="h2">{copy.emailTitle}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {copy.emailBody}
              </Typography>
            </Box>
            <EmailDeliveryFlow copy={copy} />
          </Stack>
        ) : state.step === "reauthenticate" ? (
          <Stack spacing={2} sx={{ mt: 4, alignItems: "flex-start" }}>
            <Typography color="text.secondary">{copy.sessionHelp}</Typography>
            <Button variant="contained" onClick={flow.reauthenticate}>
              {copy.signInAgain}
            </Button>
          </Stack>
        ) : state.step === "unavailable" ? (
          <Stack spacing={2} sx={{ mt: 4, alignItems: "flex-start" }}>
            <Typography color="text.secondary">
              {copy.unavailableHelp}
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
            >
              {copy.tryAgain}
            </Button>
          </Stack>
        ) : state.step === "taken" ? (
          <Alert severity="warning" sx={{ mt: 4 }}>
            <Typography variant="h6">{copy.takenTitle}</Typography>
            <Typography variant="body2">{copy.takenBody}</Typography>
          </Alert>
        ) : (
          <Box
            component="ol"
            aria-label={copy.tasksTitle}
            sx={{ listStyle: "none", p: 0, m: 0, mt: 4 }}
          >
            {taskOrder.map((task) => (
              <SetupTask
                key={task}
                title={copy.tasks[task]}
                state={taskStates[task]}
                statusLabel={copy.taskStatus[taskStates[task]]}
                focus={task === currentTask}
              >
                {(task === currentTask ||
                  (task === "activation" &&
                    (state.step === "done" || state.step === "closed"))) && (
                  <SetupTaskContent task={task} flow={flow} />
                )}
              </SetupTask>
            ))}
          </Box>
        )}
      </Box>
    </DashboardLayout>
  );
}

function statesFor(step: SetupStep): Record<TaskKey, TaskState> {
  if (step === "done" || step === "closed") {
    return {
      authority: "complete",
      organization: "complete",
      activation: "complete",
    };
  }
  if (step === "progress") {
    return {
      authority: "complete",
      organization: "complete",
      activation: "current",
    };
  }
  if (step === "organization") {
    return {
      authority: "complete",
      organization: "current",
      activation: "pending",
    };
  }

  return {
    authority: "current",
    organization: "pending",
    activation: "pending",
  };
}

function isLoadingStep(step: SetupStep): boolean {
  return step === "preflight" || step === "loading";
}
