import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/theme/fonts";

async function bootstrap(): Promise<void> {
  // Validate public configuration inside the bootstrap error boundary.
  await import("@/config/env");
  const [
    { initializeI18n },
    { initializeAuth },
    { getSetupStatus },
    { AppProvider },
    { AppRoutes, paths },
  ] = await Promise.all([
    import("../locales"),
    import("@/features/auth"),
    import("@/features/setup"),
    import("@/providers"),
    import("@/routes"),
  ]);
  await initializeI18n();
  const status = await getSetupStatus();
  const keycloak = await initializeAuth({
    allowAnonymous: status.registrationRequired,
  });

  if (
    status.registrationRequired &&
    !keycloak.authenticated &&
    window.location.pathname !== paths.setup
  ) {
    window.location.replace(paths.setup);

    return;
  }

  if (keycloak.authenticated && window.location.pathname === paths.setup) {
    window.history.replaceState(null, "", paths.home);
  }
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("React root element is missing");
  }

  createRoot(root).render(
    <StrictMode>
      <AppProvider keycloak={keycloak}>
        <AppRoutes status={status} />
      </AppProvider>
    </StrictMode>,
  );
}

void bootstrap().catch((error: unknown) => {
  console.error("Failed to initialize Bubllio", error);
  document.body.textContent =
    "Bubllio could not start. Check Core API and Bubllio Identity, then reload.";
});
