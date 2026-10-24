# First-run installation

This runbook defines the first-run ceremony for a self-hosted Bubllio Core
installation. The isolated localhost rehearsal below is executable. Production
bootstrap, shared rate limits, offline recovery, and UAT deployment remain
unavailable. Do not substitute manual database edits or broad runtime Keycloak
credentials.

## First manual test from a fresh checkout

This exercise uses its own Compose project, ports, and empty volumes. It never
resets the ordinary development stack. Use Docker Compose v2, npm, and free loopback ports
`8280`, `3200`, `5274`, and `8125`.

### Prepare a fresh checkout

Install and start Docker Desktop (or Docker Engine with Compose v2), then check
the prerequisites in a terminal:

```bash
docker compose version
docker info
node --version
```

Clone the repository and enter its root (GitHub access may be required):

```bash
git clone https://github.com/apodimi/bubllio-core.git
cd bubllio-core
```

If you received the checkout another way, open its `bubllio-core` directory.
The isolated exercise needs no `.env` file, SMTP account, npm install, or manual
database migration. It uses disposable credentials and an on-machine mail inbox.

The repository declares Node 24.22.1 in `.node-version` and `.nvmrc`. If `nvm`
is installed, run `nvm use`. On a Mac without `nvm`, check `node --version`
and continue with the system Node if it is v26.8.1; the local rehearsal and
browser tests have passed with that version. Do not block this disposable test
to install a Node version manager.

### Run the first setup

1. From the repository root, run `node scripts/bootstrap-local-setup.mjs`.
   The command builds and starts the isolated stack, including the Core web UI,
   configures the local runtime client and browser registration, and prints a
   30-minute one-time setup secret
   **once**. Keep it in the terminal. Do not paste it into chat or a file.
2. Open <http://127.0.0.1:5274/>. While Core is unconfigured, every Core
   entry route redirects to `/setup` before identity login. Choose
   **Create administrator account**. This is the first IT administrator's verified
   identity; the installation secret is still required to claim ownership.
   Enter your email in the branded Bubllio Identity registration form. Open
   <http://127.0.0.1:8125>, follow the verification email, create a password,
   and return to `/setup` signed in. The first-run screen has no existing-account
   or sign-in action. If setup has already been claimed and the browser is closed,
   reopen Core and choose **Continue setup** with the same administrator account.
3. Enter the setup secret from the terminal, name the first organization, and
   create it. Core records the operation before contacting Keycloak. Its status
   becomes **Awaiting owner** while Keycloak sends a membership invitation.
4. Accept the second email invitation. Return to `/setup`, enter the same
   secret again, and choose **Retry setup**. The same operation must finish;
   it must not create a second organization.
5. Choose **Sign in to workspace** to obtain a fresh organization-bearing
   token. The workspace should list the named organization. Its app list is
   empty until a catalog app is registered, enabled, and granted.

Keep the terminal open while using the one-time secret. If the command fails
after it creates `.local/setup-rehearsal.env`, correct the Docker or port
problem and run `node scripts/bootstrap-local-setup.mjs --resume`. This resumes
the same installation and secret expiry; the initial command must not be run a
second time.

This rehearsal ends with one owner and one organization. The Core UI for
inviting members and managing additional organizations is not implemented yet;
do not treat this manual test as evidence that team onboarding is complete.

Verify `GET http://127.0.0.1:3200/api/v1/setup/status` now returns
`{"setupRequired":false,"phase":"ready"}`. Reload and sign in again: the owner still sees the
organization, and `/setup` no longer offers a new claim. A second account must
not take over the installation. Check that the setup secret is absent from the
browser URL and local/session storage. Restart the isolated API with the same
Compose project and confirm the `READY` state persists.

### Verify the result

From another terminal in the repository root:

```bash
curl --fail http://127.0.0.1:3200/health
curl --fail http://127.0.0.1:3200/api/v1/setup/status
```

The second response must contain `"setupRequired":false` and
`"phase":"ready"`. The first workspace app list is empty by design; catalog
registration, availability, and member grants are separate operations.

To run the source checks, install dependencies and run each package's gate:

```bash
cd apps/api
npm ci
npm run format:check
npm test
npm run build
cd ../web
npm ci
npm run format:check
npm run build
cd ../keycloak-theme
npm ci
npm run build:keycloak
```

The theme's host build requires Java 21 and Maven. The Docker image builds it
without host Java or Maven, so the browser exercise can be completed first.
The browser test suite requires Google Chrome and the ordinary Compose stack
on ports `8180`, `3100`, and `5174`:

```bash
cd ../..
docker compose --env-file .env.example up -d --build
cd apps/web
npm run test:e2e
```

The isolated first-run stack uses different ports and does not replace that
browser-test fixture. GitHub Actions runs these code and browser checks on
every push and pull request. The local exercise is not evidence that a public
deployment passes the [UAT and Production gate](#uat-and-production-gate).
The imported local realm assigns the optional `organization` client scope to
Core web. Core requests `organization:*` so a member of multiple organizations
can see every authorized workspace in the switcher.

### Troubleshooting

| Symptom | Check and recovery |
| --- | --- |
| `docker info` fails | Start Docker Desktop or the Docker daemon. If local setup configuration already exists, rerun with `--resume`. |
| The bootstrap reports a bound port | Free port `8280`, `3200`, `5274`, or `8125`, then rerun with `--resume`. |
| An email is missing | Check the isolated Mailpit at `127.0.0.1:8125` and the `keycloak` service health. |
| Setup is unavailable | Check service health and the one-time secret. An expired secret can currently be reset only by destroying this disposable rehearsal. |
| No applications appear after `READY` | This is expected until an app is registered, enabled, and granted. |

To inspect service health, run:

```bash
docker compose --project-name bubllio-core-setup-rehearsal \
  --env-file .env.example --env-file .local/setup-rehearsal.env ps
```

`node scripts/bootstrap-local-setup.mjs --resume` retries local Keycloak
configuration without generating or printing a second secret. It also enables
browser registration in a rehearsal started before this UI flow was added.
If the 30-minute secret expires before setup finishes, reset
**only this disposable rehearsal project** and start a new exercise; do not
remove the ordinary development volumes:

```bash
docker compose --project-name bubllio-core-setup-rehearsal \
  --env-file .env.example --env-file .local/setup-rehearsal.env down --volumes
rm -rf .local
```

That reset permanently removes the rehearsal's Keycloak users, Core data, and
generated local configuration. The regular `bubllio-core` Compose project is
unaffected. No production setup or CRM/Board integration is implied by this
local success.

## Roles

- **Temporary Keycloak bootstrap administrator** exists only long enough to
  establish named administrators and automation identities.
- **Named Keycloak operator** manages the identity platform, uses an individual
  account and MFA, and is not automatically a Core product owner.
- **Installation operator** controls the deployment and receives the one-time
  setup secret.
- **First organization owner** is the verified human who claims the installation
  in version 1. One person may also be the installation operator.
- **Deployment provisioner** applies versioned realm/client configuration and is
  absent from the running Core API.
- **Core runtime identity** has only the reviewed organization and membership
  operations required by product workflows.

Never use the unqualified term “admin” in an operating record.

## Before starting

Verify all of the following:

1. Keycloak 26.8.1 and Core PostgreSQL are healthy on private database networks.
2. The public issuer, Core API audience, web origin, and redirect/logout URIs use
   exact environment-owned values. UAT and Production use HTTPS.
3. Email delivery is healthy. Local development uses Mailpit; UAT and Production
   use a verified sender with SPF, DKIM, DMARC, bounce, and complaint handling.
4. There are no imported demo users, default passwords, wildcard redirects, or
   publicly reachable management ports.
5. The deployment can store a root-readable setup-secret file or secret-manager
   value without printing it in CI, Compose, image layers, or process arguments.
6. Proxy, application, APM, trace, and error tooling redact `Authorization`,
   `X-Bubllio-Setup-Secret`, setup bodies, cookies, and query strings.

## Platform bootstrap

The planned `scripts/bootstrap-identity.sh` command must be idempotent. It will:

1. use temporary bootstrap authority to create or verify the Bubllio realm;
2. create exact-origin public PKCE web and Core API audience clients;
3. install the organization mapper and Bubllio Keycloakify theme;
4. enroll a named human operator through Keycloak verify-email and
   update-password required actions;
5. create separate deployment-time and runtime machine clients;
6. generate at least 256 random bits for a setup secret;
7. persist only the secret digest and 30-minute expiry for Core; and
8. display the raw secret once to the installation operator.

The raw secret must be transferred out of band. Do not email it, paste it into a
ticket/chat, place it in a URL, or add it to an environment example.

After the named Keycloak operator signs in, enable MFA, verify recovery access,
disable/delete the temporary bootstrap administrator, and remove its secret from
the deployment specification. Confirm the old credentials fail.

## Product setup

1. Open the Core web application. It reads only the coarse setup-required state.
2. Choose **Set up Bubllio** and authenticate through branded Keycloak pages.
3. Complete email verification and required actions. The local realm supports
   browser registration for suite users as well as the first owner. Production
   registration remains disabled until the release gates in
   [ADR 0010](../decisions/0010-general-browser-registration.md) are met.
4. Return to `/setup`, enter the one-time setup secret, and review the immutable
   subject and verified email shown by the application.
5. Enter the first organization display name. Core derives and reserves the
   initial slug; the wizard does not request infrastructure or SMTP settings.
6. Review the consequence and choose **Create organization** once.
7. Keep the status page open or return to it later. The durable operation shows
   Core organization, identity organization, owner membership, and token refresh
   stages without raw provider errors.
8. If the operation needs attention, record the correlation ID and use the safe
   retry only after correcting the named operator condition.
9. On success, allow Core to perform a fresh authorization flow. Do not enter a
   tenant route until the new token contains the exact immutable organization ID.
10. Verify the owner route, reload, sign out, and sign in again. Setup must never
    be offered again.

## Secret removal and completion evidence

After Core reports `READY`:

1. remove the raw setup secret from the secret manager or mounted file;
2. remove any bootstrap-administrator variables and credentials;
3. verify `POST /api/v1/setup/claim` remains unavailable;
4. verify an organization-less user receives a neutral no-access state rather
   than the setup wizard;
5. verify the runtime Keycloak identity cannot manage realms, clients,
   passwords, identity providers, impersonation, or Core roles; and
6. attach sanitized test, backup, restore, alert, and credential-removal evidence
   to the environment release record.

Never include the setup secret, its digest, access tokens, passwords, cookies,
machine credentials, raw provider responses, or full request bodies in evidence.

## Failure handling

- **Before claim**: rotate the setup secret through the planned host-side command.
  Replacement invalidates the old digest atomically.
- **Claimed or provisioning**: only the bound subject resumes. Correct the
  dependency and reconcile the existing durable operation. Do not issue a new
  public claimant secret and do not delete uncertain Keycloak state.
- **Keycloak timeout or 5xx/429**: wait for bounded retry. Reconciliation resolves
  the immutable Core organization marker before attempting creation.
- **Keycloak 401/403**: treat as `NEEDS_ATTENTION`; rotate/fix the runtime
  credential or permission set and then retry the same operation.
- **Organization alias collision**: do not adopt or delete the unrelated
  organization. Escalate using the correlation ID.
- **Browser closes or refreshes**: sign in as the same subject and resume the
  durable operation. Never submit a second organization intent.
- **Token refresh fails after completion**: retry authorization or sign out and
  sign in. Do not recreate the organization.
- **Claimant account is lost**: use the future host-side break-glass command with
  explicit installation, subject, reason, and confirmation. Never edit the
  database directly or reopen HTTP setup.
- **Installation is already `READY`**: first-run recovery is forbidden. Use the
  separately reviewed owner-recovery procedure.

## UAT and Production gate

Promotion is blocked until all of these are proven:

- clean-database enrollment and setup complete end to end;
- concurrent claims have one winner and duplicate submissions are idempotent;
- crash/restart at every Core/Keycloak boundary converges without duplication;
- hostile Origin, invalid/expired/reused secrets, unverified identity, stale
  authentication, and organization-less tenant access are denied;
- setup secrets and credentials are absent from logs, traces, audits, browser
  history/storage, screenshots, and release artifacts;
- the temporary bootstrap administrator is disabled and named administrators
  have MFA plus verified recovery;
- the runtime client passes positive and negative least-privilege tests;
- encrypted backup/restore preserves terminal `READY` state;
- rate limits and alerts work across every API replica; and
- exact HTTPS origins, redirects, issuer, and audience match the environment.

Do not promote if runtime provisioning requires `realm-admin`, first-run can be
reopened through HTTP, a non-verified identity can become owner, or completion
can occur without a fresh organization-bearing token.
