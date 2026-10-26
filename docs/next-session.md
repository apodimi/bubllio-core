# Next session

Last updated: 2026-10-26

## Resume here: UI review

The next session starts with the user's requested review of the Core UI and
first-run setup as an end user. Walk through the deployed flow screen by screen,
review the stepper, visual hierarchy, copy, loading/error/retry states, and mobile
behavior against the shared Bubllio MUI design system and CRM aesthetic. Record
observed issues before choosing improvements.

Deployment handoff: `main` now selects the verified `0.1.0-alpha.3` images in
`deploy/managed/compose.yaml`. The vault mount and realm-import directory
permissions are fixed. Release verification, browser tests, fresh production
bootstrap, and secret-free redeploy checks passed. The user reported a successful
server deployment and was configuring the three HTTPS domains in the hosting
panel. Confirm valid certificates and route reachability before entering setup
credentials; completion of the public-host browser setup remains unverified.

## Public-host UI review, 2026-10-26

The read-only end-user review reached the email-delivery form and stopped before
submitting SMTP credentials or the setup secret. The three intended origins
resolved over HTTPS with valid certificates; Core web, API liveness/readiness,
and OIDC discovery returned successfully. `/runtime-config.js` contained the
expected `api.dev.bubllio.com` and `auth.dev.bubllio.com` origins. Desktop and
390-pixel mobile layouts had clear hierarchy, readable contrast, and no
horizontal overflow in English or Greek.

The review found this deployment blocker:

- `https://auth.dev.bubllio.com/admin/` is publicly reachable and redirects to
  the Keycloak administration login. The deployment contract requires the edge
  proxy to deny this route while preserving realm OIDC, registration,
  verification, and account actions.

The repository now contains a portable fix: `identity-edge` is the only public
identity service, it proxies ordinary Keycloak traffic, and it returns `404` for
`/admin` and all child paths. Keycloak no longer joins the external edge
network. The live blocker remains open until the updated adapter is deployed and
the auth domain target changes from `keycloak:8080` to `identity-edge:8080`.

The observed UI improvements are implemented in `apps/web`:

1. The compact progress view is used at every viewport width so long Greek and
   English step labels never compete with the setup task.
2. SPA step changes move focus to the new `h1`.
3. Native validation bubbles are replaced by localized inline errors that focus
   the first invalid field.
4. Forms have stable field names, visible busy indicators, `aria-busy`, and a
   controlled Advanced settings disclosure. Browser theme metadata now matches
   the product canvas.
5. Organization copy explicitly states that member and application
   administration is not available in this technical alpha.

These UI changes are local to `apps/web`. Completing the live flow remains a
deployment/identity/email contract rehearsal across Core web, Core API,
Keycloak, the setup agent, the edge proxy, and the selected SMTP provider.

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
- Releases include a Docker-only bundle. `./bubllio prepare` derives the strict
  contract from a base domain and edge network, creates private file secrets,
  writes exact runtime inputs, and prints the setup secret once. `doctor` checks
  the host before `up`; a source checkout and host Node are not required.
- Tagged releases also generate a digest-pinned Dokploy Compose adapter. Its
  one-shot initializer accepts only the base domain and a unique setup secret,
  creates scoped named-volume credentials, and supports redeploy after the raw
  bootstrap value is removed from the panel.
- The same deployable adapter is checked in at `deploy/managed/compose.yaml`
  with its published release manifest, so Dokploy can deploy directly from
  GitHub `main`. CI checks that the snapshot matches its manifest and template.
- `deploy/compose/` is the first thin adapter. Separate non-root API, migration,
  web, and optimized Keycloak images are defined, with private database networks,
  read-only application containers, one-shot migrations, and realm bootstrap.
- `.github/workflows/release-images.yml` verifies and publishes multi-architecture
  GHCR images with provenance, SBOMs, and an immutable digest manifest.
- The setup UI configures and proves SMTP delivery before account creation. A
  separate internal setup agent owns temporary Keycloak authority and writes
  only the SMTP password to Keycloak's private file vault; the Core API cannot
  access either.

The root development Compose stack remains the authoritative local environment.
The portable adapter is an internal technical-alpha reference, not an approved
external or Production release.

## Release blockers still open

1. Select and approve a real SMTP provider, sender-domain authentication,
   bounce/complaint handling, processor terms, retention, and operational
   ownership. The product configuration and proof flow is implemented, but the
   external provider and privacy decision remain environment responsibilities.
2. Close the external-registration privacy and abuse gate: privacy notice,
   controller/processor decisions, DPIA screening, rate limits, recovery, and
   named human approval. Do not describe the current build as GDPR-ready.
3. Add a tested data lifecycle: member offboarding, access/export/rectification,
   retention and pseudonymisation, Core-Keycloak reconciliation, privacy-safe
   logging, and incident/breach operations.
4. Build and start the exact production images behind real HTTPS on a clean host.
   Prove least-privilege Keycloak permissions, setup convergence, health routing,
   secret removal, and app-manifest reconciliation.
   The same rehearsal must exercise the Dokploy adapter's first deploy, browser
   claim, environment-secret removal, redeploy, restart, and durable state.
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
node scripts/test-universal-installer.mjs
```

The detailed executable plan remains local at
`plan/infrastructure-portable-delivery-1.md` and is intentionally ignored by Git.
