# Bubllio Core Agent Guide

Read `../AGENTS.md` for workspace routing and shared engineering rules. This
file is authoritative for changes inside `bubllio-core/`.

## Current phase

The repository is in foundation development. Documents under `docs/decisions/`
are proposals until their status is `Accepted`. Do not present an accepted
technology choice as production-ready behavior until its deployment gates pass.

Before production implementation:

1. Read `PRODUCT.md`.
2. Read the relevant architecture pages.
3. Check the decision index and any superseding ADR.
4. Put product code in `apps/`, platform configuration in `infrastructure/`, and
   experimental evidence—not active implementation—in `docs/spikes/`.

## Boundaries

- Keycloak is the proposed identity provider. Core must not handle passwords,
  MFA secrets, recovery codes, or token signing keys.
- Core owns product organization state, application availability, entitlements,
  installations, and suite-level contracts.
- Applications own their domain data and fine-grained domain authorization.
- Never access another application's database directly.
- Use immutable external IDs and versioned HTTP/event contracts.
- Preserve a compatibility path for existing CRM authentication until an
  explicitly tested migration is approved.

## Security rules

- Validate token signature, issuer, audience, expiry, and required organization
  context at every API boundary.
- Treat organization IDs and resource IDs as lookup inputs, never authorization.
- Keep client secrets and administrator credentials out of source and browser
  storage.
- Prefer Authorization Code with PKCE for browser applications.
- Use narrowly scoped machine identities for service communication.
- Add allowed and denied two-organization tests for tenant-owned behavior.
- Record assumptions and unknowns instead of weakening a security gate.

## Architecture rules

- Start as a modular service, not a collection of microservices.
- Prefer REST/OpenAPI for synchronous contracts.
- Add asynchronous events only for real decoupling or durable side effects.
- Use a transactional outbox before publishing state-change events.
- Make consumers idempotent and version event payloads.
- Do not introduce shared runtime libraries across repositories merely to share
  types; generate clients or types from versioned contracts where practical.

## Developer experience

- Organize source code by product feature first, then by technical responsibility
  only when that split makes navigation clearer.
- Prefer small, cohesive files with names that reveal their single responsibility.
  Treat growth beyond roughly 150 lines as a review signal, not an automatic split.
- Avoid generic `utils`, `helpers`, `common`, and `shared` dumping grounds. Keep a
  helper beside the feature that owns its meaning.
- Add concise comments for security invariants, protocol constraints, surprising
  framework behavior, and architectural reasons. Do not narrate obvious code.
- Add short JSDoc to exported boundary APIs when callers need usage or safety
  context that the type signature cannot express.
- Introduce an abstraction after a real second use or a proven testing boundary,
  not in anticipation of possible reuse.
- Keep controllers thin: parse transport input, call one application operation,
  and return its result. Authentication and token parsing never belong there.

## Git conventions

- Every commit subject starts with one Unicode Gitmoji and an imperative summary,
  for example `✨ Add organization switching` or `🐛 Reject expired tokens`.
- Use the Gitmoji that represents the primary intent; do not stack emojis or mix
  unrelated changes in one commit.

## Documentation and verification

- Give each page one primary question.
- Record long-lived choices as ADRs with context, alternatives, and consequences.
- Put spike evidence in the matching spike document.
- Keep working implementation plans local under `plan/`; do not commit them.
  Promote only accepted decisions, implemented invariants, public contracts, and
  sanitized operational guidance into `docs/`.
- Every completed change must report checks run, skipped checks, and residual
  identity, tenant, compatibility, or deployment risks.

