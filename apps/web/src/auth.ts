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
export async function initializeAuth({
  allowAnonymous,
}: {
  allowAnonymous: boolean;
}): Promise<Keycloak> {
  await keycloak.init({
    // An incomplete installation keeps its public operator steps reachable.
    // Existing sessions still resume inside the authenticated Core shell.
    onLoad: allowAnonymous ? "check-sso" : "login-required",
    flow: "standard",
    pkceMethod: "S256",
    // TODO(release): Restore organization:* after existing realms can be
    // reconciled online without replacing their users or organizations.
    scope: "organization",
    checkLoginIframe: false,
  });

  return keycloak;
}
