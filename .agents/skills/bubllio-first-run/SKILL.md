---
name: bubllio-first-run
description: Diagnose or change Bubllio Core first-run setup, Keycloak account creation, organization invitations, and the transition to the normal workspace.
---

# Bubllio first run

Use this for Core installation and identity flow work. Read the workspace and
Core `AGENTS.md`, `PRODUCT.md`, `docs/architecture/organization-security.md`,
and the smallest relevant setup or identity file before changing behavior.
For a report of a broken flow, follow the `diagnosing-bugs` loop if available.

## Source of truth

- Core's `GET /api/v1/setup/status` is the coarse public installation state.
  `phase: ready` means the setup singleton reached `READY`; it does not prove
  that the browser has a fresh token or that every UI asset is current.
- Keycloak owns credentials, verification, sessions, and organization
  membership. Core owns the setup claim, product organization, and app grants.
  Never infer membership from the existence of a Keycloak account.
- The first administrator needs a verified identity and the one-time setup
  secret. The claim is bound to the immutable `sub`. A retry must use the same
  subject and durable operation rather than creating another organization.
- Public realm registration is temporary for the first administrator. It must
  close in Keycloak when the verified subject proves the setup secret. A hidden
  theme link or Core redirect alone does not close it. Token-bearing
  organization invitations are the separate path for later users.
- The identity setup agent has temporary realm-management authority. The Core
  runtime must not gain permanent `manage-realm` or broad `manage-users` just to
  bypass an onboarding problem.

## Debugging evidence

Inspect the exact failing browser request, status, safe error code, and
correlation ID; compare them with server logs and the deployed image. Distinguish
an expired login session, an invalid token claim, a pending owner invitation,
and a failed Core setup operation. Do not ask for passwords, raw setup secrets,
bearer tokens, cookies, or invitation URLs containing action tokens.

An invitation can add Keycloak membership before its final redirect fails.
When that is plausible, reopen Core with the same account and retry the existing
operation before sending another invite. An old invitation keeps the redirect
captured when it was sent. If the setup is already `READY`, route the user to
normal login/workspace; do not reopen setup or reset volumes.

For Keycloak behavior, verify the pinned version's official documentation or
source and test the relevant path. Check invite handling with public
registration disabled before claiming new-member enrollment works.

## Completion

State the observable success and recovery criteria, update the affected
runbook and tests, then run the Core gates. For an existing installation,
separate behavior of new code from one-time realm reconciliation: changing a
realm import with `--override=false` will not mutate the existing realm.
