import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://127.0.0.1:8180",
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
    scope: "profile email organization:*",
    checkLoginIframe: false,
  });

  return keycloak;
}
