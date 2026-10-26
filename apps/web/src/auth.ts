import Keycloak from "keycloak-js";

import { browserRuntimeConfig } from "./runtime-config";

const { keycloakUrl } = browserRuntimeConfig();

const keycloak = new Keycloak({
  url: keycloakUrl,
  realm: "bubllio",
  clientId: "bubllio-core-web",
});

/**
 * Initializes OIDC before React mounts because Keycloak consumes callback values
 * from the URL. Tokens intentionally remain only in the adapter's memory.
 */
export async function initializeAuth(): Promise<Keycloak> {
  await keycloak.init({
    // Core is an authenticated workspace. Existing suite sessions return
    // immediately; anonymous visitors continue straight to the login page.
    onLoad:
      window.location.pathname === "/setup" ? "check-sso" : "login-required",
    flow: "standard",
    pkceMethod: "S256",
    // TODO(release): Restore organization:* after existing realms can be
    // reconciled online without replacing their users or organizations.
    scope: "organization",
    checkLoginIframe: false,
  });

  return keycloak;
}
