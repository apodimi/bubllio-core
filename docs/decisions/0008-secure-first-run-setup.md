# ADR 0008: Secure first-run installation setup

- Status: Accepted
- Date: 2026-10-23

## Context

A new Bubllio installation must create its first product organization and owner.
That user cannot already have an organization claim, while ordinary Core routes
correctly require organization membership. Allowing the first authenticated
user to become owner would expose an uninitialized deployment to takeover.

Keycloak also has a separate infrastructure bootstrap lifecycle. Its temporary
administrator and realm-management credentials must never become browser input
or product authority.

## Decision

Platform bootstrap and product first-run are separate ceremonies.

Platform bootstrap is versioned, idempotent operator automation. It configures
the realm, clients, scopes, theme, named human operator, deployment identity,
and least-privilege runtime identity. Temporary bootstrap-administrator access
is removed after named administrator access and recovery are verified.

Product first-run is a browser flow that requires both:

1. a valid, recently authenticated Core-audience OIDC subject with a verified
   email; and
2. a short-lived, one-use installation setup secret delivered out of band.

Authentication is separated from tenant authorization. A verified subject may
have no organizations. Only the setup endpoints accept that condition; every
tenant endpoint continues to require exact immutable Keycloak organization
membership, active Core organization state, and a sufficient Core role.

The installation is a durable singleton with the lifecycle `NOT_STARTED ->
CLAIMED -> PROVISIONING -> READY`. Provisioning may enter `NEEDS_ATTENTION` and
resume, but `READY` is terminal. The claim is atomically bound to the immutable
OIDC subject. Concurrent claimants cannot create multiple first organizations.

The initial claimant becomes both the installation owner and first organization
owner in version 1. Delegation uses the later invitation flow. Core never
collects passwords, MFA secrets, or identity recovery data.

Cross-system work is persisted before Keycloak is called and reconciled by an
immutable Core organization marker. Uncertain external state is never deleted
as compensation. Completion requires matching Core and Keycloak organization
state, exact-subject membership, active Core ownership, and a fresh token that
contains the immutable organization ID.

Setup recovery is an offline operator operation. No HTTP endpoint can reopen a
completed installation.

## Alternatives considered

- First authenticated user wins: rejected because registration or credential
  compromise would allow installation takeover.
- Collect the initial password in Core: rejected because Keycloak owns account
  enrollment, password policy, MFA, sessions, and recovery.
- Use the temporary Keycloak bootstrap administrator as product owner: rejected
  because infrastructure and product authorities have different privileges and
  lifecycles.
- Put the setup secret in a URL: rejected because URLs leak through browser
  history, referrers, proxies, screenshots, and support tooling.
- Enable unrestricted self-registration until setup completes: rejected for
  version 1 because closing registration atomically across Core and Keycloak is
  unnecessary risk. Bootstrap automation enrolls a named operator instead.
- Add a queue or workflow engine: rejected because PostgreSQL durable operations
  and leases meet the first version's reliability needs.

## Consequences

[ADR 0010](0010-general-browser-registration.md) later proposes permanent
verified identity registration. It does not change this ADR's two-proof setup
claim or its rejection of a temporary registration switch.

- OIDC parsing must represent a valid subject independently from organization
  context, followed by a separate tenant authorization guard.
- Setup requires a persistent singleton, idempotency, operation leases,
  reconciliation, rate limiting, secret redaction, and safe operator recovery.
- The current access token is stale after membership creation; the browser must
  deliberately reauthenticate before entering the organization.
- Production cannot ship with demo users, default setup secrets, a temporary
  bootstrap administrator, or a runtime `realm-admin` credential.
- Invitations, access requests, delegated initial ownership, and hosted
  control-plane enrollment remain separate product increments.
