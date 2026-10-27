import { useEffect, useRef, type ReactNode } from "react";
import type Keycloak from "keycloak-js";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import { CoreShell } from "../core-shell";
import type { setupCopy, SetupLocale } from "../setup-copy";
import { EmailDeliveryStep } from "./EmailDeliveryStep";
import { AccountStep, OrganizationStep } from "./SetupFormSteps";
import { OperationStep, WorkspaceStep } from "./SetupOutcomeSteps";
import type { SetupStep } from "./setup-flow.reducer";
import { useSetupFlow } from "./useSetupFlow";

type Copy = (typeof setupCopy)[SetupLocale];
type TaskState = "complete" | "current" | "pending";
type TaskKey = keyof Copy["tasks"];

const taskOrder: readonly TaskKey[] = [
  "authority",
  "organization",
  "activation",
];

export function SetupTasksPage({ keycloak }: { keycloak: Keycloak }) {
  const flow = useSetupFlow(keycloak);
  const { copy, state } = flow;
  const taskStates = statesFor(state.step);
  const currentTask = taskOrder.find((task) => taskStates[task] === "current");

  return (
    <CoreShell
      keycloak={keycloak}
      locale={flow.locale}
      onLocaleChange={flow.setLocale}
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
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", mt: 4 }}
            role="status"
          >
            <CircularProgress size={20} />
            <Typography color="text.secondary">{copy.loading}</Typography>
          </Stack>
        ) : state.step === "email" ? (
          <Stack spacing={2.5} sx={{ mt: 4 }}>
            <Box>
              <Typography variant="h2">{copy.emailTitle}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {copy.emailBody}
              </Typography>
            </Box>
            <EmailDeliveryStep copy={copy} onReady={flow.continueAfterEmail} />
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
                {task === currentTask ||
                (task === "activation" &&
                  (state.step === "done" || state.step === "closed"))
                  ? taskContent(task, state.step, flow, keycloak)
                  : undefined}
              </SetupTask>
            ))}
          </Box>
        )}
      </Box>
    </CoreShell>
  );
}

function SetupTask({
  children,
  focus,
  state,
  statusLabel,
  title,
}: {
  children?: ReactNode;
  focus: boolean;
  state: TaskState;
  statusLabel: string;
  title: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focus) headingRef.current?.focus();
  }, [focus]);

  return (
    <Box
      component="li"
      aria-current={state === "current" ? "step" : undefined}
      sx={{
        py: { xs: 2.5, sm: 3 },
        borderTop: "1px solid",
        borderColor: "divider",
        opacity: state === "pending" ? 0.62 : 1,
        "&:last-child": { borderBottom: "1px solid", borderColor: "divider" },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 0.5, sm: 2 }}
        sx={{ justifyContent: "space-between", alignItems: { sm: "baseline" } }}
      >
        <Typography
          ref={headingRef}
          tabIndex={focus ? -1 : undefined}
          variant="h5"
          component="h2"
          sx={{ "&:focus": { outline: "none" } }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          color={state === "current" ? "primary.main" : "text.secondary"}
          sx={{ fontWeight: 700, flexShrink: 0 }}
        >
          {statusLabel}
        </Typography>
      </Stack>
      {children && <Box sx={{ mt: 2.5 }}>{children}</Box>}
    </Box>
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

function taskContent(
  task: TaskKey,
  step: SetupStep,
  flow: ReturnType<typeof useSetupFlow>,
  keycloak: Keycloak,
): ReactNode {
  if (task === "authority" && step === "secret") {
    return (
      <AccountStep
        step="secret"
        keycloak={keycloak}
        copy={flow.copy}
        secret={flow.state.secret}
        busy={flow.state.busy}
        onSecretChange={flow.setSecret}
        onClaim={flow.submitClaim}
      />
    );
  }
  if (task === "organization" && step === "organization") {
    return (
      <OrganizationStep
        copy={flow.copy}
        value={flow.state.organizationName}
        busy={flow.state.busy}
        onChange={flow.setOrganizationName}
        onSubmit={flow.submitOrganization}
      />
    );
  }
  if (task === "activation" && step === "progress" && flow.state.operation) {
    return (
      <OperationStep
        copy={flow.copy}
        operation={flow.state.operation}
        secret={flow.state.secret}
        busy={flow.state.busy}
        onSecretChange={flow.setSecret}
        onRetry={flow.submitRetry}
      />
    );
  }
  if (task === "activation" && (step === "done" || step === "closed")) {
    return (
      <WorkspaceStep
        keycloak={keycloak}
        copy={flow.copy}
        complete={step === "done"}
      />
    );
  }
  return undefined;
}

function isLoadingStep(step: SetupStep): boolean {
  return step === "preflight" || step === "loading";
}
