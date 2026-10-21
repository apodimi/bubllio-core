# Next session

Last updated: 2026-10-22

## Where we stopped

The first browser identity slice is implemented:

- `apps/web` is a Vite React/TypeScript client using Authorization Code with
  PKCE through `keycloak-js`.
- Anonymous visitors are sent directly to Keycloak and tokens remain in memory.
- The Core API accepts the configured browser origin and keeps `/me` protected
  by the existing OIDC guard.
- `apps/keycloak-theme` is a standalone React/TypeScript Keycloakify theme with
  the Bubllio visual system, responsive form controls, password visibility, and
  English/Greek switching.
- The local realm selects the `bubllio` theme and enables `en` and `el`.
- Compose builds an immutable local Keycloak image containing the generated
  provider JAR; the former FreeMarker source mount has been removed.

## Verification completed

- The theme TypeScript and Vite production build pass.
- Keycloakify 11.16.4 produces both supported provider JAR variants; the
  Keycloak 26+ JAR contains `theme/bubllio/login/theme.properties` and its
  compiled frontend resources.
- `docker compose --env-file .env.example config --quiet` passes.
- Generated dependency, Vite, browser, and JAR artifacts are ignored and were
  removed from the working tree.

The complete Keycloak image build was not rerun after Maven was added to its
build stage because the agent sandbox lost access to the local Docker socket.
The isolated build used the same Node image and successfully produced the JAR.

## Start here tomorrow

1. From the repository root, rebuild and start the local stack:

   ```bash
   docker compose --env-file .env.example up -d --build
   ```

2. Start the browser client:

   ```bash
   cd apps/web
   npm ci
   npm run dev
   ```

3. Open <http://127.0.0.1:5174> and verify the complete path:
   redirect → English/Greek login → authenticated `/me` → logout → protected
   redirect.
4. Exercise the password-reset page and the narrow mobile layout. Email delivery
   is not complete until local SMTP behavior is explicitly configured.
5. Record the observed browser evidence in `docs/spikes/keycloak-sso.md`.

## Next product milestone

After the local browser flow is recorded, prove organization context with two
users in different organizations, then begin the additive CRM integration. Do
not start Board domain work until SSO, logout, and cross-organization rejection
have evidence.
