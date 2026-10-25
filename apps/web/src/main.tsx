import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";

import { App } from "./app";
import { SetupApp } from "./setup-app";
import { initializeAuth } from "./auth";
import { queryClient } from "./query-client";
import { setupStatus } from "./setup-api";
import { theme } from "./styles/theme";
import "./styles/fonts";
import "./styles.css";

async function bootstrap(): Promise<void> {
  // The installation state decides the entry route before OIDC can redirect to login.
  const status = await setupStatus();
  if (status.setupRequired && window.location.pathname !== "/setup") {
    window.location.replace("/setup");
    return;
  }

  const keycloak = await initializeAuth();
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("React root element is missing");
  }

  createRoot(root).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          {window.location.pathname === "/setup" ? (
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
