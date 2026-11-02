import { Alert } from "@mui/material";

import { MainLayout } from "@/layouts";
import { useSetupFlow } from "../flows/setupFlow/useSetupFlow";
import { pageContent } from "../flows/setupPageContent";
import { SetupStepContent } from "../flows/SetupStepContent";

export function SetupPage() {
  const flow = useSetupFlow();
  const { state, copy } = flow;
  const content = pageContent(state.step, state.operation?.status, copy);
  const viewKey = `${state.step}:${state.operation?.status ?? ""}`;
  const welcome =
    state.step === "preflight" ||
    state.step === "email" ||
    state.step === "intro" ||
    state.step === "resume" ||
    state.step === "loading";
  return (
    <MainLayout
      title={content.title}
      body={content.body}
      viewKey={viewKey}
      welcome={welcome}
      signOutLabel={copy.signOut}
    >
      {state.error && (
        <Alert severity="error" role="alert">
          {state.error}
        </Alert>
      )}
      <SetupStepContent flow={flow} />
    </MainLayout>
  );
}
