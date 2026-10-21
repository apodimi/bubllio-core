import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import { initializeAuth } from "./auth";
import "./fonts";
import "./styles.css";

async function bootstrap(): Promise<void> {
  const keycloak = await initializeAuth();
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("React root element is missing");
  }

  createRoot(root).render(
    <StrictMode>
      <App keycloak={keycloak} />
    </StrictMode>,
  );
}

void bootstrap().catch((error: unknown) => {
  console.error("Failed to initialize Bubllio authentication", error);
  document.body.textContent =
    "Authentication could not be initialized. Is Keycloak running?";
});
