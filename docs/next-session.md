# Next session

Last updated: 2026-10-23

## Where we stopped

The secure first-run foundation is ready:

- Prisma 7.10.1 connects the Core API to its own PostgreSQL database through
  `apps/api/prisma.config.ts`.
- Three migrations create the organization foundation, the installation setup
  singleton, and claim idempotency support.
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
- `SetupModule` contains the setup repository and guards, but it is deliberately
  not imported by `AppModule` yet because the HTTP controller is the next slice.

The detailed implementation plan remains local at
`plan/feature-first-run-setup-1.md` and is intentionally ignored by Git.

## Verification completed

- API tests: 35 passing across 8 test files.
- API production build passes.
- Formatting and `git diff --check` pass.
- Both installation setup SQL integration scripts pass against PostgreSQL:
  `installation-setup.sql` and `installation-setup-claim.sql`.
- All three local migrations are applied.
- The local installation record remains `NOT_STARTED` at version 1 because the
  integration tests run inside transactions and roll back.
- The temporary integration-test database container was removed.

## Start here tomorrow

1. Build `POST /api/v1/setup/claim` test-first.
2. Connect the guard chain in this order: authentication,
   `SetupSubjectGuard`, `SetupSecretGuard`, then `SetupRepository.claim()`.
3. Validate the idempotency header and return the OpenAPI-defined outcomes:
   `201` for the first claim, `200` for a replay, and a generic conflict for a
   competing claimant.
4. Import `SetupModule` into `AppModule`, allow the required POST/custom headers
   in CORS, and add `Cache-Control: no-store` to setup responses.
5. Add HTTP tests covering a signed organization-less token, wrong secret,
   stale authentication, unverified email, competing claimant, and replay.
6. After the claim endpoint is complete, implement the setup status endpoint.

Useful verification command:

```bash
cd apps/api
npm test && npm run build && npm run format:check
```

To inspect the local services:

```bash
docker compose --env-file .env.example ps
```
