# Next session

Last updated: 2026-10-24

## Where we stopped

The first portable delivery slice of ADR 0011 is implemented:

- The API reads one immutable validated runtime configuration. Production
  rejects insecure public URLs, loopback dependencies, local-only flags,
  incomplete setup proof, and missing application manifests before startup.
- `/health/live`, `/health/ready`, and `/api/v1/system/preflight` separate process
  liveness, operational dependency readiness, and product-safe setup guidance.
- A strict data-only deployment manifest owns the installed application catalog.
  Startup reconciliation is transactional, removed apps become unavailable, and
  production HTTP registration is closed.
- Core web receives public API and identity origins at container startup through
  `/runtime-config.js`; no environment-specific frontend rebuild is required.
- The setup UI begins with responsive EN/EL system checks and blocks progression
  until database, identity, migrations, and the app manifest are ready. The
  existing claim, owner, organization, retry, and workspace flow is preserved.
- `deploy/contract/` defines the canonical digest-only installation input.
  `scripts/prepare-installation.mjs` validates it, creates private file secrets,
  writes exact runtime inputs, and prints the setup secret once.
- `deploy/compose/` is the first thin adapter. Separate non-root API, migration,
  web, and optimized Keycloak images are defined, with private database networks,
  read-only application containers, one-shot migrations, and realm bootstrap.
- `.github/workflows/release-images.yml` verifies and publishes multi-architecture
  GHCR images with provenance, SBOMs, and an immutable digest manifest.

The root development Compose stack remains the authoritative local environment.
The portable adapter is an internal technical-alpha reference, not an approved
external or Production release.

## Release blockers still open

1. Configure and test SMTP before account creation. The production realm requires
   verified email, so first-owner registration and invitations cannot complete
   without it. SMTP secret storage and provider/privacy boundaries need a reviewed
   design rather than an unencrypted field added to the browser.
2. Close the external-registration privacy and abuse gate: privacy notice,
   controller/processor decisions, DPIA screening, rate limits, recovery, and
   named human approval. Do not describe the current build as GDPR-ready.
3. Add a tested data lifecycle: member offboarding, access/export/rectification,
   retention and pseudonymisation, Core-Keycloak reconciliation, privacy-safe
   logging, and incident/breach operations.
4. Build and start the exact production images behind real HTTPS on a clean host.
   Prove least-privilege Keycloak permissions, setup convergence, health routing,
   secret removal, and app-manifest reconciliation.
5. Implement and rehearse encrypted backup/restore, upgrade, rollback, shared
   rate limiting, monitoring, and alerting.
6. Complete member directory and grant-management UI, then prove CRM denial and
   allow paths against Core. Board is not required to validate the Core model.

## Verification baseline

- API focused and full tests, formatting, and production build must pass.
- Web formatting and production build must pass; Playwright setup tests cover
  ready, blocked, retry, Greek, and mobile behavior.
- Installation schema positive/negative tests, secret-preparation idempotence,
  Compose configuration, and adapter validation must pass.
- Production image builds and a clean-host HTTPS rehearsal remain mandatory
  before any UAT or external alpha claim.

Useful commands:

```bash
cd apps/api
npm test && npm run build && npm run format:check

cd ../web
npm run build && npm run format:check

cd ../..
node scripts/prepare-installation.mjs \
  --contract deploy/contract/bubllio-installation.example.json \
  --validate-only
```

The detailed executable plan remains local at
`plan/infrastructure-portable-delivery-1.md` and is intentionally ignored by Git.
