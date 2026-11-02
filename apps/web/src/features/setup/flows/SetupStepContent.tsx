import { Box, Button, Stack, Typography } from "@mui/material";

import { LoadingStatus } from "@/components";
import {
  AccountStep,
  OrganizationStep,
  OperationStep,
  PreflightStep,
  WorkspaceStep,
} from "../steps";
import { EmailDeliveryFlow } from "./emailDelivery/EmailDeliveryFlow";
import type { useSetupFlow } from "./setupFlow/useSetupFlow";

interface SetupStepContentProps {
  flow: ReturnType<typeof useSetupFlow>;
}

export function SetupStepContent(props: SetupStepContentProps) {
  const { flow } = props;
  const { state, copy, preflightQuery } = flow;

  if (state.step === "preflight") {
    return (
      <Stack spacing={2}>
        {(preflightQuery.isError ||
          preflightQuery.data?.status === "attention") && (
          <Typography variant="h5" component="h2">
            {copy.preflightTitle}
          </Typography>
        )}
        <PreflightStep
          copy={copy}
          preflight={preflightQuery.data}
          loading={preflightQuery.isPending || preflightQuery.isFetching}
          error={preflightQuery.isError}
          onRetry={() => void preflightQuery.refetch()}
        />
      </Stack>
    );
  }

  if (state.step === "email") {
    return (
      <Box component="section" aria-labelledby="email-delivery-title">
        <Typography id="email-delivery-title" variant="h5" component="h2">
          {copy.emailTitle}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          {copy.emailBody}
        </Typography>
        <EmailDeliveryFlow copy={copy} />
      </Box>
    );
  }

  if (state.step === "loading") {
    return <LoadingStatus label={copy.loading} />;
  }

  if (state.step === "reauthenticate") {
    return (
      <Button
        variant="contained"
        onClick={flow.reauthenticate}
        sx={{ alignSelf: "flex-start" }}
      >
        {copy.signInAgain}
      </Button>
    );
  }

  if (state.step === "unavailable") {
    return (
      <Button
        variant="contained"
        onClick={() => window.location.reload()}
        sx={{ alignSelf: "flex-start" }}
      >
        {copy.tryAgain}
      </Button>
    );
  }

  if (
    state.step === "intro" ||
    state.step === "resume" ||
    state.step === "taken" ||
    state.step === "secret"
  ) {
    return (
      <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
        {(state.step === "intro" || state.step === "resume") && (
          <Typography variant="h5" component="h2">
            {state.step === "intro" ? copy.beginTitle : copy.resumeTitle}
          </Typography>
        )}
        <AccountStep
          step={state.step}
          copy={copy}
          secret={state.secret}
          busy={state.busy}
          onSecretChange={flow.setSecret}
          onClaim={flow.submitClaim}
        />
      </Stack>
    );
  }

  if (state.step === "organization") {
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

  if (state.step === "progress" && state.operation) {
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

  if (state.step === "done" || state.step === "closed") {
    return <WorkspaceStep copy={copy} complete={state.step === "done"} />;
  }

  return null;
}
