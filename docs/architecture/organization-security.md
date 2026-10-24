# Organization security boundary

This page defines the authorization invariants for Core organization features.
Implementation is being delivered incrementally; an endpoint is not available
merely because its invariant appears here.

## Trust boundary

Keycloak proves who the caller is and which identity organizations the current
access token contains. Core proves whether the matching product organization is
active and which suite capability that subject holds. Neither proof is
sufficient alone for a privileged organization operation.

For every tenant request Core must:

1. validate token signature, issuer, audience, expiry, and subject;
2. resolve the route organization in the Core database;
3. require its immutable Keycloak organization ID in the verified token;
4. require the Core organization to be active;
5. evaluate the subject's Core `owner`, `admin`, or `member` role.

Aliases, slugs, route parameters, and body identifiers are lookup inputs only.
Core never selects the first organization in a multi-organization token.

Authentication and tenant authorization are separate checks. A token may prove
a valid human subject while containing no organization membership. Such a
subject cannot access any tenant resource. The sole exception is the dedicated
first-run setup policy described below.

## First-run installation ceremony

First-run is not ordinary onboarding. Platform bootstrap configures Keycloak
through operator automation before the product wizard is available. Bootstrap
administrator, named Keycloak operator, Core product owner, deployment
provisioner, and Core runtime service account are distinct principals.

The realm begins with browser registration disabled. Before a human identity
can be created, the operator must configure and prove email delivery through
the product UI. Core authenticates that pre-account mutation with the one-time
setup secret and delegates the privileged Keycloak work to the isolated,
temporary identity setup agent defined in
[ADR 0012](../decisions/0012-isolate-email-bootstrap-authority.md). A real test
message carries a short-lived confirmation code. Registration opens only after
the code is confirmed and the agent has retired its own bootstrap client.

The permanent Core runtime cannot mutate realm settings or clients. Core never
persists SMTP connection fields, credentials, the test recipient, or provider
responses. Its durable email state contains only a non-secret fingerprint,
keyed code digest, expiry and attempt counters, timestamps, and a bounded error
code. Keycloak references the authenticated SMTP password from its file vault;
the password is not duplicated in Core.

Claiming an uninitialized installation requires two independent proofs:

1. a valid Core-audience OIDC token with immutable subject, verified email, and
   authentication no older than ten minutes; and
2. a 256-bit opaque setup secret delivered through an operator-controlled
   out-of-band channel and supplied in `X-Bubllio-Setup-Secret`.

The setup secret is stored only as a digest, expires after 30 minutes, is
compared in constant time, and is never placed in a URL, cookie, browser
storage, log, trace, audit event, analytics event, or committed configuration.
The raw secret is displayed once by bootstrap automation. Production rejects
default, short, or missing secrets while setup is enabled.

The database singleton is the final setup authority. Its lifecycle is:

```text
NOT_STARTED -> CLAIMED -> PROVISIONING -> READY
                               |
                               +-> NEEDS_ATTENTION -> PROVISIONING
```

The claim is atomically bound to the OIDC subject. Only that subject may resume
or inspect detailed progress. `READY` is terminal and disables setup even if a
secret remains configured. Recovery never deletes the row or reopens an HTTP
setup endpoint; it is an explicit host-side operation with audit evidence.

The local Keycloak realm supports browser registration with verified email for
both the first owner and later suite users. Registration creates an identity,
not membership, a Core role, or an app grant. A registered account alone cannot
claim Core without the independent setup secret. Production enrollment remains
gated by [ADR 0010](../decisions/0010-general-browser-registration.md) and
the deployment controls in the first-run runbook.

Completion requires all of the following:

- an active Core organization with an immutable Keycloak organization ID;
- the exact claimant subject as a Keycloak organization member;
- an active Core `owner` assignment;
- a successful durable provisioning operation and audit outcome; and
- a newly issued access token containing the exact organization ID.

Setup mutations, including pre-account email setup, require a trusted exact
`Origin`, exact CORS, JSON and request size validation, an idempotency key,
shared rate limiting, and generic failure responses. Setup pages and responses
are `no-store`, send no referrer, deny framing, use a strict CSP without
third-party scripts, and redact authorization, setup secret, body, and provider
data throughout proxy and application observability.

Initial rate-limit defaults are five failed claims per 15 minutes per IP, ten
per hour installation-wide, one active claim globally, and 30 status reads per
minute per IP. These values are configuration, enforced before expensive
provider work, and must use shared state before horizontal scaling.

## First-run attacker stories

- **Internet scanner finds `/setup`**: public status returns only a coarse
  installation phase; mutation still requires recent verified OIDC and the setup
  secret. Failures reveal no claimant or secret state.
- **Setup secret is stolen**: it cannot grant authority without a verified
  human identity. Operators can rotate an unclaimed secret atomically.
- **Identity is substituted after login**: the claim binds to immutable `sub`,
  never caller-provided email or user ID.
- **Two operators race**: a singleton compare-and-set transition allows exactly
  one claimant; duplicate intent is resolved through request hash and
  idempotency key.
- **Keycloak succeeds before Core records success**: retry first resolves the
  organization through the immutable Core marker and continues idempotently.
- **Runtime machine credential is compromised**: it cannot administer realms,
  clients, passwords, identity providers, impersonation, or Core roles.
- **Email bootstrap authority is compromised after setup**: the bootstrap
  client is already disabled and cannot obtain another token. The runtime can
  only read the non-secret readiness marker for crash reconciliation.
- **SMTP test is replayed or guessed**: the mutation requires the independent
  setup secret and idempotency key; the confirmation code is keyed, short-lived,
  and attempt-bounded, and delivery inputs are not retained by Core.
- **Completed setup is replayed**: terminal database state rejects the request
  regardless of secret validity or deployment configuration.
- **Operator loses access during provisioning**: host-side break-glass recovery
  requires explicit identifiers, reason, confirmation, and immutable audit; it
  cannot re-enable public setup.

## Suite roles

- `owner` may administer roles and ownership. The final active owner cannot be
  removed or demoted.
- `admin` may manage members and ordinary invitations but cannot grant or revoke
  ownership.
- `member` may enter the organization but has no suite-administration authority.

These roles grant no CRM or Board domain permissions.

## Application access

Core owns an explicit grant identified by immutable organization ID, Keycloak
subject, and stable application key. The grant is separate from Keycloak
membership, the Core suite role, the organization's app availability, and an
app's own domain role. Missing, revoked, or suspended grants deny access.

An integrated application backend must validate its audience and the exact
organization context, then obtain Core's decision for its own registered app
key before resolving tenant data. Core checks active organization state,
identity membership, installation/entitlement and organization availability,
and the member grant. A direct URL or API request follows the same gate as the
Core launcher. Frontend visibility is only a convenience.

Positive decision caching, if used, has a short explicit lifetime and fails
closed after expiry or Core unavailability. Revocation behavior and emergency
session termination require cross-application tests before production rollout.
Core suite owners do not receive automatic data access to installed apps.
Core's own console is controlled by organization membership and suite roles;
it is not a grantable app, so the first owner can manage grants after setup.

## Invitation invariants

- Core owns invitation intent, requested role, state, idempotency, and audit.
- Invitation secrets contain at least 256 random bits, expire after 24 hours,
  are one-use, and are stored only as a digest with a safe lookup prefix.
- Acceptance requires authentication, a verified email, an exact normalized
  email match, and an explicit state-changing POST.
- Pending, expired, revoked, or partially provisioned invitations never grant
  access.
- Keycloak performs final identity membership through a least-privilege machine
  client. Core never reads invitation links back from Keycloak.
- Resending rotates the secret and invalidates the previous link.

Invitation pages use `Cache-Control: no-store`, `Referrer-Policy: no-referrer`,
a strict CSP, and no third-party analytics.

## Failure and privacy behavior

Cross-organization access to confidential resources returns 404. A confirmed
member without a required capability receives 403; invalid authentication
receives 401. Public flows do not expose a searchable organization directory or
reveal whether a private organization or email exists.

Keycloak and Core cannot share one transaction. Mutations record durable
progress, retry idempotently, and reconcile external state. They never delete
uncertain pre-existing membership as compensation.

Audit events contain the actor, organization, target, action, outcome,
correlation ID, idempotency ID, and sanitized role state. Tokens, credentials,
invitation secrets, and email bodies are forbidden.

Setup audit and logs additionally forbid setup-secret digests, raw Keycloak
responses, authorization headers, request bodies, and browser enrollment data.
