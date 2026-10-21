---
goal: Prove Keycloak SSO and organization-aware token validation for Bubllio Core, CRM, and Board
version: 1.0
date_created: 2026-10-21
last_updated: 2026-10-21
owner: Bubllio
status: 'In progress'
tags: [infrastructure, identity, keycloak, oidc, security, spike]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In_progress-yellow)

This plan produces reproducible evidence that the accepted Keycloak foundation
can provide suite SSO, organization context, resource-server validation, and
machine authentication before production deployment begins.

## 1. Requirements & Constraints

- **REQ-001**: Start Keycloak 26.8.1 and its isolated PostgreSQL database from `compose.yaml` with one documented command.
- **REQ-002**: Import a reproducible `bubllio` realm containing Core, CRM, Board, and machine clients without committing runtime secrets.
- **REQ-003**: Provide a minimal NestJS 12 API with `GET /health` and authenticated `GET /me` endpoints.
- **REQ-004**: Validate SSO across Core, CRM, and Board browser clients with Authorization Code and PKCE.
- **REQ-005**: Capture the exact Keycloak organization scope and token claim shape from runtime evidence.
- **REQ-006**: Demonstrate an additive CRM Keycloak-token validation path without replacing SimpleJWT.
- **REQ-007**: Demonstrate a Board-to-CRM company-summary request with same-organization authorization.
- **SEC-001**: Resource servers must validate signature, issuer, audience, expiry, and organization context.
- **SEC-002**: Negative tests must cover wrong issuer, wrong audience, expiry, missing organization, cross-organization access, and machine-to-user privilege escalation.
- **SEC-003**: Browser clients must not receive or persist confidential client secrets.
- **SEC-004**: Realm exports, examples, logs, and test fixtures must contain only disposable credentials and neutral identities.
- **CON-001**: Experimental CRM and browser integrations must remain isolated from existing defaults until their acceptance tests pass.
- **CON-002**: Use Node 24 LTS as the declared baseline even when a newer Current release is installed locally.
- **CON-003**: Keep Core, CRM, Board, and Keycloak storage boundaries separate.
- **GUD-001**: Prefer official container images, framework packages, and documented OIDC discovery/JWKS behavior.
- **GUD-002**: Record observed evidence and unknowns in `docs/spikes/keycloak-sso.md`; accepted technology choices do not waive production gates.
- **PAT-001**: Use versioned REST/OpenAPI contracts for synchronous application communication.
- **PAT-002**: Use immutable Keycloak subject and organization identifiers; never join identities by mutable email alone.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Create the reproducible identity environment and minimal Core resource server.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `.env.example`, `compose.yaml`, and `infrastructure/keycloak/realm-bubllio.local.json` for pinned Keycloak 26.8.1 and PostgreSQL with local-only ports and health checks. | ✅ | 2026-10-21 |
| TASK-002 | Scaffold `apps/api/` as NestJS 12 ESM TypeScript using Node 24 LTS, Vitest, strict TypeScript, and the Fastify adapter. | ✅ | 2026-10-21 |
| TASK-003 | Implement `GET /health` and OIDC discovery/JWKS-backed authentication for `GET /me`, returning only validated subject, issuer, audience, and organization context. | ✅ | 2026-10-21 |
| TASK-004 | Add unit tests for accepted and rejected token claims without requiring a live Keycloak process. | ✅ | 2026-10-21 |
| TASK-005 | Document exact setup, start, reset, and verification commands in the root README and spike evidence page. | ✅ | 2026-10-21 |

### Implementation Phase 2

- GOAL-002: Prove browser SSO, organization behavior, and service authentication against live Keycloak.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Add minimal Core and Board browser clients using Authorization Code with PKCE and no browser client secret. | | |
| TASK-007 | Create two disposable organizations and users, capture actual organization claims, and document multi-organization context selection. | | |
| TASK-008 | Verify one login session, refresh behavior, local logout, suite logout, token revocation, and signing-key rotation. | | |
| TASK-009 | Configure a least-privilege machine client and verify allowed and denied service requests. | | |
| TASK-010 | Record observed runtime evidence for every Phase 2 scenario. | | |

### Implementation Phase 3

- GOAL-003: Prove additive CRM compatibility and the first cross-application resource link.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Add an isolated Keycloak JWT authentication adapter to CRM without changing its default SimpleJWT configuration. | | |
| TASK-012 | Add positive and negative CRM tests for issuer, audience, subject mapping, organization mapping, and two-organization isolation. | | |
| TASK-013 | Add a minimal authorized CRM company-summary endpoint and OpenAPI contract for the spike. | | |
| TASK-014 | Add a minimal Board resource reference and resolve an allowed CRM company summary while rejecting a cross-organization reference. | | |
| TASK-015 | Document the reversible CRM account/session migration strategy using observed compatibility evidence. | | |

### Implementation Phase 4

- GOAL-004: Close the spike with an evidence-based identity decision.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Run every mandatory positive and negative scenario from `docs/spikes/keycloak-sso.md` and attach evidence paths. | | |
| TASK-017 | Measure local resource use, startup behavior, backup inputs, realm reproducibility, and upgrade/rollback steps. | | |
| TASK-018 | Evaluate supported Keycloak theming against the required Bubllio login experience without maintaining a fork. | | |
| TASK-019 | Review the remaining proposed ADRs and production gates from recorded evidence; ADRs 0001 and 0002 are accepted. | | |
| TASK-020 | Remove experimental paths that did not contribute evidence and produce the production-deployment follow-up plan only if all mandatory gates pass. | | |

## 3. Alternatives

- **ALT-001**: Use ZITADEL for the same spike if Keycloak fails a mandatory identity, organization, operational, or UX criterion.
- **ALT-002**: Extend Django/SimpleJWT into suite identity; not selected because application authentication helpers do not provide a mature identity platform.
- **ALT-003**: Implement identity in NestJS or FastAPI; rejected because custom protocol and credential lifecycle would create unacceptable security scope.
- **ALT-004**: Replace CRM authentication immediately; rejected because the spike requires additive compatibility and rollback evidence first.

## 4. Dependencies

- **DEP-001**: Docker Engine and Docker Compose v2-compatible CLI.
- **DEP-002**: `quay.io/keycloak/keycloak:26.8.1` pinned by digest after image resolution.
- **DEP-003**: A supported PostgreSQL container pinned by digest.
- **DEP-004**: Node.js 24 LTS for declared runtime compatibility.
- **DEP-005**: NestJS 12, Fastify platform adapter, JOSE-compatible JWT validation, TypeScript, and Vitest.
- **DEP-006**: Existing Bubllio CRM Django/DRF test and authentication infrastructure.

## 5. Files

- **FILE-001**: `compose.yaml` defines isolated spike infrastructure.
- **FILE-002**: `.env.example` documents disposable local configuration names.
- **FILE-003**: `infrastructure/keycloak/realm-bubllio.local.json` defines reproducible local realm clients and safe development identities.
- **FILE-004**: `apps/api/` contains the NestJS Core resource server.
- **FILE-005**: `apps/web/` will contain the Core OIDC browser client.
- **FILE-006**: The future Board repository contains the Board client/API and resource-reference proof.
- **FILE-007**: `docs/spikes/keycloak-sso.md` owns experiment evidence and verdict.
- **FILE-008**: CRM spike adapter and tests remain within explicitly isolated `bubllio-crm` paths selected during Phase 3.

## 6. Testing

- **TEST-001**: `docker compose config` validates the fully rendered local topology.
- **TEST-002**: Core API unit tests accept a correctly signed token and reject each invalid claim class.
- **TEST-003**: Live health checks prove Keycloak, PostgreSQL, and Core API readiness.
- **TEST-004**: Browser automation proves SSO and logout across three registered clients.
- **TEST-005**: Two-organization API tests prove allowed and denied resource access.
- **TEST-006**: Machine-client tests prove allowed service scope and rejection of user-only operations.
- **TEST-007**: CRM regression tests prove SimpleJWT remains functional during the additive spike.
- **TEST-008**: OpenAPI validation proves the company-summary consumer and provider agree.

## 7. Risks & Assumptions

- **RISK-001**: Keycloak organization behavior may not map cleanly to Bubllio's product organization lifecycle.
- **RISK-002**: Suite logout and browser cookie boundaries may produce surprising intermediate sessions.
- **RISK-003**: Keycloak resource and operational cost may be disproportionate for small self-hosted installations.
- **RISK-004**: Existing CRM password hashes or sessions may not support a transparent migration.
- **RISK-005**: A convenient multi-audience token design may weaken resource-server isolation.
- **RISK-006**: The local Node 26 runtime may hide incompatibility with the declared Node 24 LTS baseline.
- **ASSUMPTION-001**: The first supported topology is one self-hosted Bubllio suite installation.
- **ASSUMPTION-002**: One Keycloak realm represents that suite installation.
- **ASSUMPTION-003**: CRM, Board, and Core remain independently deployable applications.
- **ASSUMPTION-004**: Domain permissions remain authoritative inside each application.

## 8. Related Specifications / Further Reading

- [`../PRODUCT.md`](../PRODUCT.md)
- [`../docs/architecture/system-context.md`](../docs/architecture/system-context.md)
- [`../docs/architecture/identity-and-organizations.md`](../docs/architecture/identity-and-organizations.md)
- [`../docs/architecture/cross-app-contracts.md`](../docs/architecture/cross-app-contracts.md)
- [`../docs/spikes/keycloak-sso.md`](../docs/spikes/keycloak-sso.md)
- [Keycloak container guide](https://www.keycloak.org/getting-started/getting-started-docker)
- [Keycloak OIDC endpoints](https://www.keycloak.org/securing-apps/oidc-layers)
- [NestJS first steps](https://docs.nestjs.com/first-steps)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
