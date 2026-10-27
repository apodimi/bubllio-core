import type Keycloak from "keycloak-js";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";

import type { setupCopy, SetupLocale } from "../setup-copy";
import type { SetupStep } from "./setup-flow.reducer";
import { SetupFrame } from "./SetupFrame";
import { EmailDeliveryStep } from "./EmailDeliveryStep";
import { PreflightStep } from "./PreflightStep";
import { AccountStep, OrganizationStep } from "./SetupFormSteps";
import { LoadingStep, OperationStep, WorkspaceStep } from "./SetupOutcomeSteps";
import { useSetupFlow } from "./useSetupFlow";

type Copy = (typeof setupCopy)[SetupLocale];

export function SetupPage({ keycloak }: { keycloak: Keycloak }) {
  const flow = useSetupFlow(keycloak);
  const { state, copy, preflightQuery } = flow;
  const content = pageContent(state.step, state.operation?.status, copy);

  return (
    <SetupFrame
      keycloak={keycloak}
      locale={flow.locale}
      onLocaleChange={flow.setLocale}
      title={content.title}
      body={content.body}
      viewKey={`${state.step}:${state.operation?.status ?? ""}`}
      signOutLabel={copy.signOut}
    >
      {state.error && (
        <Alert severity="error" role="alert">
          {state.error}
        </Alert>
      )}
      {state.step === "preflight" && (
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
      )}
      {state.step === "email" && (
        <Box component="section" aria-labelledby="email-delivery-title">
          <Typography id="email-delivery-title" variant="h5" component="h2">
            {copy.emailTitle}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            {copy.emailBody}
          </Typography>
          <EmailDeliveryStep copy={copy} onReady={flow.continueAfterEmail} />
        </Box>
      )}
      {state.step === "loading" && <LoadingStep label={copy.loading} />}
      {state.step === "reauthenticate" && (
        <Button
          variant="contained"
          onClick={flow.reauthenticate}
          sx={{ alignSelf: "flex-start" }}
        >
          {copy.signInAgain}
        </Button>
      )}
      {state.step === "unavailable" && (
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{ alignSelf: "flex-start" }}
        >
          {copy.tryAgain}
        </Button>
      )}
      {(state.step === "intro" ||
        state.step === "resume" ||
        state.step === "taken" ||
        state.step === "secret") && (
        <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
          {(state.step === "intro" || state.step === "resume") && (
            <Typography variant="h5" component="h2">
              {state.step === "intro" ? copy.beginTitle : copy.resumeTitle}
            </Typography>
          )}
          <AccountStep
            step={state.step}
            keycloak={keycloak}
            copy={copy}
            secret={state.secret}
            busy={state.busy}
            onSecretChange={flow.setSecret}
            onClaim={flow.submitClaim}
          />
        </Stack>
      )}
      {state.step === "organization" && (
        <OrganizationStep
          copy={copy}
          value={state.organizationName}
          busy={state.busy}
          onChange={flow.setOrganizationName}
          onSubmit={flow.submitOrganization}
        />
      )}
      {state.step === "progress" && state.operation && (
        <OperationStep
          copy={copy}
          operation={state.operation}
          secret={state.secret}
          busy={state.busy}
          onSecretChange={flow.setSecret}
          onRetry={flow.submitRetry}
        />
      )}
      {(state.step === "done" || state.step === "closed") && (
        <WorkspaceStep
          keycloak={keycloak}
          copy={copy}
          complete={state.step === "done"}
        />
      )}
    </SetupFrame>
  );
}

function pageContent(
  step: SetupStep,
  operationStatus: string | undefined,
  copy: Copy,
): { title: string; body: string } {
  if (
    step === "preflight" ||
    step === "email" ||
    step === "intro" ||
    step === "resume"
  )
    return { title: copy.welcomeTitle, body: copy.welcomeBody };
  if (step === "taken") return { title: copy.takenTitle, body: copy.takenBody };
  if (step === "secret")
    return { title: copy.authorityTitle, body: copy.authorityBody };
  if (step === "reauthenticate")
    return { title: copy.sessionTitle, body: copy.sessionHelp };
  if (step === "organization")
    return { title: copy.organizationTitle, body: copy.organizationBody };
  if (step === "progress") {
    if (operationStatus === "awaiting_owner")
      return { title: copy.invitationTitle, body: copy.invitationBody };
    if (operationStatus === "needs_attention")
      return { title: copy.attentionTitle, body: copy.attentionBody };
    return { title: copy.progressTitle, body: copy.progressBody };
  }
  if (step === "done") return { title: copy.doneTitle, body: copy.doneBody };
  if (step === "closed")
    return { title: copy.closedTitle, body: copy.closedBody };
  if (step === "unavailable")
    return { title: copy.unavailableTitle, body: copy.unavailableHelp };
  return { title: copy.welcomeTitle, body: copy.welcomeBody };
}
