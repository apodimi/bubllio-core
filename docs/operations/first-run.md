# First-run installation

This runbook defines the target first-run ceremony for a self-hosted Bubllio
Core installation. The automation and HTTP endpoints remain unavailable until
their implementation tasks are complete. Do not substitute manual database
edits or broad Keycloak credentials.

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
3. Complete email verification and required actions. Public self-registration is
   disabled in version 1.
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
