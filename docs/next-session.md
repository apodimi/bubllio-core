# Next session

Last updated: 2026-10-23

## Where we stopped

The secure first-run foundation is ready:

- Prisma 7.10.1 connects the Core API to its own PostgreSQL database through
  `apps/api/prisma.config.ts`.
- Five migrations create the organization foundation, installation setup,
  application access, and owner invitation wait state.
- OIDC verification accepts an authenticated user without an organization for
  the narrow setup flow, while malformed organization claims are rejected.
- Tenant endpoints can require an exact immutable organization ID through
  `OrganizationContextGuard` and `@RequireOrganizationContext()`.
- Setup access requires a recently authenticated, verified-email identity and
  a time-limited setup secret whose SHA-256 digest is stored in configuration.
- `InstallationSetup` models the first-run state machine. The database prevents
  changes or deletion after the installation reaches `READY`.
- `SetupRepository.claim()` atomically handles the initial claim, safe replay
  with the same idempotency key, and conflicts from another claimant.
- `SetupModule` is imported by `AppModule`. Public setup status, claim,
  organization creation, and durable retry are implemented. Mutations are
  disabled by default and only enabled in the isolated localhost rehearsal.
- Claim validates a verified recent subject, the out-of-band secret, exact web
  origin, JSON empty body, and UUID idempotency key. It returns `201` for the
  winner, `200` for replay, and a generic `409` for conflicts.
- The application-access foundation has a registered app catalog, per-organization
  availability and entitlement flags, and explicit member grants. Core resolves
  the route Core organization to its immutable Keycloak organization ID before
  listing apps or deciding access. The browser now shows the granted-app workspace.
  Core web uses the CRM's brand palette, typography and Material UI component
  language, with TanStack Query for server state. The CRM repository is unchanged.
- An isolated localhost first-run rehearsal now creates the Core organization,
  resolves the Keycloak organization by immutable marker, sends the first owner
  an invitation, and reaches terminal READY after acceptance and retry. The
  browser has an EN/EL `/setup` route with browser-based owner registration and
  forces a fresh sign-in at completion.
  Its runbook is `docs/operations/first-run.md`. Production setup remains closed.
- No product app consumes the decision API yet. CRM still uses its existing
  authentication path; Board does not exist.

The detailed implementation plan remains local at
`plan/feature-first-run-setup-1.md` and is intentionally ignored by Git.

## Verification completed

- API tests: 75 passing across 12 test files, including setup and app access.
- API production build passes.
- Formatting and `git diff --check` pass.
- Web build and all seven browser identity/workspace/setup tests pass against the local stack.
- The Keycloak theme built as part of the Docker image. The host-side
  `build:keycloak` command could not package the JAR because Maven is absent.
- The previous session passed both installation setup SQL integration scripts
  against PostgreSQL. The isolated rehearsal applied all five migrations.
- Live HTTP smoke checks passed for `/health`, public setup status, and the
  unauthenticated claim rejection.
- The application-access and owner-invitation migrations applied successfully through the local
  `core-migrate` container, which exited with code 0.
- A real isolated PostgreSQL + Keycloak service run reached CLAIMED, awaited an
  owner invitation, replayed the same intent, and reached READY after membership
  was supplied. The browser tests currently mock setup API and registration
  responses; full
  email-click-to-READY browser automation is still needed.

## Start here tomorrow

1. Complete real browser automation from browser owner registration through
   invitation acceptance, fresh token, and owner workspace; run the same steps
   manually from a clean checkout.
2. Add shared rate limiting, offline recovery, service-account fine-grained
   user read permission, and production bootstrap before enabling setup outside
   an isolated localhost rehearsal.
3. Complete ADR 0009 by adding a safe member directory and grant-management UI,
   and prove direct API denial in CRM before calling suite integration complete.
   The catalog, grants, and decision API are implemented; Board is not required
   for the Core model.

Useful verification command:

```bash
cd apps/api
npm test && npm run build && npm run format:check
```

To inspect the local services:

```bash
docker compose --env-file .env.example ps
```
