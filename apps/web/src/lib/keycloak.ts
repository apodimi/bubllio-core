import Keycloak from "keycloak-js";

import { env } from "@/config/env";

// Keycloak owns tokens in memory; no browser storage adapter is configured.
export const keycloak = new Keycloak({
  url: env.keycloakUrl,
  realm: "bubllio",
  clientId: "bubllio-core-web",
});
