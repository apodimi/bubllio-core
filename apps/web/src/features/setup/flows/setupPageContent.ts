import type { SetupCopy as Copy } from "../../../../locales";
import type { SetupStep } from "./setupFlow/setupFlow.reducer";

export function pageContent(
  step: SetupStep,
  operationStatus: string | undefined,
  copy: Copy,
): { title: string; body: string } {
  switch (step) {
    case "preflight":
    case "email":
    case "intro":
    case "resume":
    case "loading":
      return { title: copy.welcomeTitle, body: copy.welcomeBody };
    case "taken":
      return { title: copy.takenTitle, body: copy.takenBody };
    case "secret":
      return { title: copy.authorityTitle, body: copy.authorityBody };
    case "reauthenticate":
      return { title: copy.sessionTitle, body: copy.sessionHelp };
    case "organization":
      return { title: copy.organizationTitle, body: copy.organizationBody };
    case "progress":
      if (operationStatus === "awaiting_owner") {
        return { title: copy.invitationTitle, body: copy.invitationBody };
      }
      if (operationStatus === "needs_attention") {
        return { title: copy.attentionTitle, body: copy.attentionBody };
      }

      return { title: copy.progressTitle, body: copy.progressBody };
    case "done":
      return { title: copy.doneTitle, body: copy.doneBody };
    case "closed":
      return { title: copy.closedTitle, body: copy.closedBody };
    case "unavailable":
      return { title: copy.unavailableTitle, body: copy.unavailableHelp };
  }
}
