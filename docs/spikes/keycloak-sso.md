# Keycloak SSO spike

## Purpose

Reduce the largest platform risk before production scaffolding: prove that
Keycloak can provide the identity, organization, browser-session, and service
contracts required by Core, CRM, and Board.

The initial experiment established the accepted Keycloak and NestJS foundation,
which now lives in `apps/api` and `infrastructure/keycloak`. This document
continues to own the unresolved SSO, organization, migration, and operational
evidence. Experimental adapters and clients remain disposable until their own
acceptance criteria pass.

## Validation topology

```text
Docker Compose
├── Keycloak
├── Keycloak PostgreSQL
├── minimal Core NestJS API/client
├── minimal Board client/API
└── CRM integration branch or isolated adapter
```

Use one `bubllio` realm, one demo organization, two users in different
organizations, three browser clients, and at least one machine client.

## Questions to answer

### Browser identity

- Does Authorization Code with PKCE work cleanly for the React clients?
- Does one Keycloak session provide SSO across Core, CRM, and Board?
- What exactly happens during local logout and suite logout?
- How are refresh rotation, revocation, expiry, and clock skew handled?

### Organizations and authorization

- What organization scope must each client request?
- What exact organization claim appears in access and ID tokens?
- Can one user belong to multiple organizations and select context safely?
- Can each resource server reject missing, wrong, or ambiguous organization
  context?
- Can two-organization tests prove isolation in CRM and the minimal Board API?

### Resource servers and services

- Can NestJS and Django validate issuer, audience, signature, expiry, and claims
  using discovery/JWKS without shared secrets?
- How does signing-key rotation behave while applications are running?
- Which service credential flow supports Board-to-CRM calls, and how is the end
  user's authorization preserved when required?

### Operations and UX

- Can the complete environment start predictably from documented commands?
- Which Keycloak data, secrets, and configuration require backup?
- Can realm/client configuration be exported and reproduced without committing
  credentials?
- Can supported theming deliver an acceptable Bubllio login experience without
  maintaining a fragile Keycloak fork?
- What are the upgrade and rollback steps?

### CRM migration

- Can Keycloak tokens be accepted additively alongside SimpleJWT?
- How will existing users be matched without relying on mutable email alone?
- Can current sessions remain valid during a compatibility window?
- Is password-hash migration supported and safe, or is enrollment/reset required?

## Required negative tests

- Wrong issuer.
- Wrong audience.
- Expired or revoked token.
- Missing organization context.
- User from organization A requesting organization B data.
- Machine client attempting a user-only operation.
- Linked CRM resource from another organization.

## Exit criteria

The spike passes only when:

- Core, CRM, and Board demonstrate SSO with one identity session;
- every token-validation rule has positive and negative evidence;
- organization context and tenant isolation are unambiguous;
- service authentication has a least-privilege design;
- logout and key rotation behavior are documented from observation;
- local deployment is repeatable;
- CRM migration has a reversible path;
- operational and UX costs are acceptable.

If a mandatory criterion fails, compare ZITADEL against the same criteria before
considering custom identity implementation.

## Evidence log

Record each experiment with:

```text
Date:
Keycloak version/image digest:
Scenario:
Configuration:
Expected result:
Observed result:
Evidence path:
Decision impact:
```

### 2026-10-21 — reproducible baseline

- **Keycloak image:** `quay.io/keycloak/keycloak:26.8.1@sha256:79c623a22abacf3fe6c00a5fb30f5b7843d717b234033b80995891c06116d244`
- **Scenario:** Start PostgreSQL, import the `bubllio` realm, start Keycloak,
  and start the minimal NestJS resource server from a clean Compose build.
- **Expected:** All three services become healthy; the realm discovery document
  and Core `/health` endpoint respond successfully.
- **Observed:** All services reached `healthy`; discovery reported issuer
  `http://127.0.0.1:8180/realms/bubllio`; `/health` returned
  `{"status":"ok"}`.
- **Automated evidence:** Core API formatting, nine authentication tests, and
  the Node 24 container build passed. The tests cover global public/protected
  routing, valid identity context, wrong audience, wrong issuer, missing or
  malformed organization context, and expiry.
- **Configuration note:** Browser-visible issuer validation remains
  `127.0.0.1`; the container uses an internal `OIDC_JWKS_URL` solely to fetch
  the same realm's signing keys without weakening exact issuer validation.
- **Decision impact:** Phase 1 infrastructure and resource-server foundations
  are viable. Browser SSO, live organization claims, revocation, logout, and
  cross-application isolation remain unproven.
- **NestJS integration:** Authentication is registered as a global `APP_GUARD`.
  `/health` opts out with `@Public()`, while `/me` is protected by default and
  receives its verified principal through `@CurrentIdentity()`. Runtime smoke
  checks returned `200` for `/health` and `401` for `/me` without a token.

