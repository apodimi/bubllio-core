# ADR 0001: Use Keycloak for suite identity

- Status: Accepted
- Date: 2026-10-21

## Context

The CRM currently implements local Django authentication and issues SimpleJWT
tokens. A suite containing Core, CRM, Board, and future applications needs SSO,
shared identity, organization membership, machine identities, token lifecycle,
MFA, recovery, federation, and auditable administration.

Implementing an identity provider inside Core would make Bubllio responsible for
security protocols and credential lifecycle that are outside its differentiating
product domain.

## Decision

Use Keycloak as the suite identity provider. Core and every application act
as OIDC clients/resource servers and do not store credentials or sign competing
suite tokens.

The technology choice is accepted. Production rollout remains gated by the
mandatory security, organization-isolation, migration, UX, and operational
evidence in the identity plan; acceptance does not waive those gates.

## Alternatives considered

- Continue expanding Django/SimpleJWT: lowest immediate change, but makes the CRM
  an accidental suite identity provider and requires substantial protocol work.
- ZITADEL: strong B2B and self-hosted capabilities; retain as the primary fallback
  if Keycloak fails the spike or creates unacceptable operational/UX cost.
- Authentik: capable OIDC platform, but not the current first choice for Bubllio's
  product-centered organization model.
- Custom NestJS/FastAPI identity provider: rejected because framework security
  helpers are not a substitute for a mature identity product.

## Consequences

- The suite gains a standards-based identity boundary and mature security flows.
- Self-hosting includes another stateful service and its upgrade/backup duties.
- Login and account UX require supported Keycloak theming or extension points.
- CRM authentication needs a staged migration and rollback path.
- Keycloak availability affects new authentication, so failure behavior and
  operations must be tested.

