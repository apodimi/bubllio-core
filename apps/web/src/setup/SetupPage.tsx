import type Keycloak from "keycloak-js";
import { Alert, Button } from "@mui/material";

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
      activeStage={activeStage(state.step, copy.railSteps.length)}
      progress={{
        label: copy.progressLabel,
        steps: copy.railSteps,
        statuses: copy.stepStatus,
        stepOf: copy.stepOf,
      }}
      signOutLabel={copy.signOut}
    >
      {state.error && (
        <Alert severity="error" role="alert">
          {state.error}
        </Alert>
      )}
      {state.step === "preflight" && (
        <PreflightStep
          copy={copy}
          preflight={preflightQuery.data}
          loading={preflightQuery.isPending || preflightQuery.isFetching}
          error={preflightQuery.isError}
          onRetry={() => void preflightQuery.refetch()}
          onContinue={flow.continueFromPreflight}
        />
      )}
      {state.step === "email" && (
        <EmailDeliveryStep copy={copy} onReady={flow.continueAfterEmail} />
      )}
      {state.step === "loading" && <LoadingStep label={copy.loading} />}
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
        <AccountStep
          step={state.step}
          keycloak={keycloak}
          copy={copy}
          secret={state.secret}
          busy={state.busy}
          onSecretChange={flow.setSecret}
          onClaim={flow.submitClaim}
        />
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

function activeStage(step: SetupStep, totalStages: number): number {
  if (step === "preflight" || step === "loading" || step === "unavailable")
    return 0;
  if (step === "email") return 1;
  if (step === "intro" || step === "resume" || step === "taken") return 2;
  if (step === "secret") return 3;
  if (step === "organization") return 4;
  if (step === "progress") return 5;
  return totalStages;
}

function pageContent(
  step: SetupStep,
  operationStatus: string | undefined,
  copy: Copy,
): { title: string; body: string } {
  if (step === "preflight")
    return { title: copy.preflightTitle, body: copy.preflightBody };
  if (step === "email") return { title: copy.emailTitle, body: copy.emailBody };
  if (step === "intro") return { title: copy.beginTitle, body: copy.beginBody };
  if (step === "resume")
    return { title: copy.resumeTitle, body: copy.resumeBody };
  if (step === "taken") return { title: copy.takenTitle, body: copy.takenBody };
  if (step === "secret")
    return { title: copy.authorityTitle, body: copy.authorityBody };
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
  return { title: copy.title, body: copy.intro };
}
