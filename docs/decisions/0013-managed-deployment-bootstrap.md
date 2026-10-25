# ADR 0013: Managed deployment bootstrap

- Status: Accepted
- Date: 2026-10-25

## Context

The portable release bundle proves the canonical deployment contract, but its
host-side `prepare` step is unnecessary friction on platforms that already own
Compose execution, durable volumes, environment input, and HTTPS routing.
Making one hosting panel part of Core would reduce portability, while requiring
operators to copy generated files into every panel would undermine the intended
UI-first installation experience.

The installation must still resist first-visitor takeover. Internal database,
OIDC, and setup-agent credentials must not become operator questionnaire fields,
and redeploying must not rotate an existing installation.

## Decision

Managed-platform adapters accept two operator inputs:

```text
BUBLLIO_BASE_DOMAIN
BUBLLIO_SETUP_SECRET
```

The base domain is ordinary configuration. For the internal technical alpha,
the setup secret is unique 256-bit base64url material supplied through a
service-scoped platform secret or environment field. Only a hardened one-shot
initializer receives it. The initializer validates it, persists only its digest
and bounded expiry, creates every unrelated internal credential independently,
and stores those credentials in narrowly scoped durable volumes.

Initialization is create-once and idempotent. A restart or redeploy reuses the
same state. A changed domain or setup secret fails closed instead of silently
rotating authority. The web, API, identity provider, databases, and setup agent
never receive the raw setup secret.

Each released adapter is generated from the immutable release manifest, so its
images are digest-pinned. Platform-specific networking and route declarations
remain in the thin adapter; Core product behavior remains platform-independent.
The downloadable bundle remains the reference portable adapter.

After the first administrator claims the installation, the operator removes
`BUBLLIO_SETUP_SECRET` from the platform and redeploys. Existing digest state
allows that deployment to succeed without the raw value.

## Consequences

- A managed installation requires no SSH, host files, generated `.env` copy, or
  manual migration command.
- Dokploy is the first conformance target, not the canonical product runtime.
- During bootstrap, trusted platform and Docker administrators may inspect the
  raw environment input. This is an accepted internal-alpha risk, not a
  Production secret-delivery approval.
- Production support still requires a platform secret adapter or external
  secret manager with proven access, retention, deletion, backup, audit,
  recovery, and rotation behavior.
- A clean-host rehearsal must prove first deploy, claim, variable removal,
  redeploy, restart, persistence, network isolation, and failure recovery before
  the adapter is described as validated.

## Decision owners

- Product/operator journey: accepted by the product owner directing this alpha.
- Design journey: reviewed; no separate human design approval recorded.
- Engineering/security acceptance beyond internal alpha: pending human owner.
- Privacy/legal approval for real-user use: pending human owner.
