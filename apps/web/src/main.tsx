import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";

import { App } from "./app";
import { SetupApp } from "./setup-app";
import { SetupTasksPage } from "./setup/SetupTasksPage";
import { initializeAuth } from "./auth";
import { queryClient } from "./query-client";
import { setupStatus } from "./setup-api";
import { theme } from "./styles/theme";
import "./styles/fonts";
import "./styles.css";

async function bootstrap(): Promise<void> {
  const status = await setupStatus();
  const keycloak = await initializeAuth({
    allowAnonymous: status.registrationRequired,
  });

  if (
    status.registrationRequired &&
    !keycloak.authenticated &&
    window.location.pathname !== "/setup"
  ) {
    window.location.replace("/setup");
    return;
  }

  if (keycloak.authenticated && window.location.pathname === "/setup") {
    window.history.replaceState(null, "", "/");
  }
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("React root element is missing");
  }

  createRoot(root).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          {status.setupRequired && keycloak.authenticated ? (
            <SetupTasksPage keycloak={keycloak} />
          ) : status.setupRequired ? (
            <SetupApp keycloak={keycloak} />
          ) : (
            <App keycloak={keycloak} />
          )}
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}

void bootstrap().catch((error: unknown) => {
  console.error("Failed to initialize Bubllio", error);
  document.body.textContent =
    "Bubllio could not start. Check Core API and Bubllio Identity, then reload.";
});
