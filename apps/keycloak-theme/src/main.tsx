import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KcPage } from "./kc.gen";

async function render() {
  let kcContext = window.kcContext;

  // Vite has no Keycloak server context, so development gets a realistic login fixture.
  if (import.meta.env.DEV && !kcContext) {
    const { getKcContextMock } = await import("./login/getKcContextMock");
    const requestedPage = new URLSearchParams(window.location.search).get(
      "page",
    );
    const pageId =
      requestedPage === "login-update-password.ftl"
        ? "login-update-password.ftl"
        : "login.ftl";
    kcContext = getKcContextMock({
      pageId,
      overrides: {
        realm: {
          internationalizationEnabled: true,
        },
        locale: {
          currentLanguageTag: "en",
          supported: [
            { languageTag: "en", label: "English", url: "#en" },
            { languageTag: "el", label: "Ελληνικά", url: "#el" },
          ],
        },
      },
    });
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {kcContext ? (
        <KcPage kcContext={kcContext} />
      ) : (
        <p>No Keycloak context.</p>
      )}
    </StrictMode>,
  );
}

void render();
