# ADR 0014: Let Keycloak deliver organization invitation links

- Status: Proposed
- Date: 2026-11-04

## Context

Core needs to invite a person to one organization with a Core role and selected
application access. Public browser registration is closed after first-run.
The current organization security design assigns a 256-bit one-use invitation
secret to Core. Keycloak's organization invitation API instead creates and
emails its own opaque action link. The Admin REST API deliberately does not
return that link. Core cannot deliver a Core-owned link through this API.

An isolated Keycloak 26.8.1 experiment found that a native invitation works
with public registration disabled. Resending rotates the provider invitation;
deleting it revokes the link; successful acceptance makes replay fail. New and
existing verified accounts joined the exact invited organization. Passing the
Core web client as `client_id` failed because that client requires PKCE, so
the native invitation must use the provider's default action flow. See the
[spike evidence](../spikes/keycloak-sso.md).

## Proposed decision

Use Keycloak's native organization invitation link for the identity and email
step. Core stores a separate invitation intent: organization, normalized email,
requested Core role, selected application keys, provider invitation ID, status,
expiry, inviter subject, and bounded timestamps. Core stores no action link or
link digest. A pending intent grants no Core role or application access.

After Keycloak membership is established, the invitee signs in to Core with a
fresh organization-scoped token and explicitly accepts the matching Core intent.
Core requires verified email, exact normalized email and organization match,
rechecks the selected applications, then activates the Core role and grants in
one database transaction. A provider membership without this Core acceptance
has no Core role or app grant. Retry and reconciliation must be idempotent.

Core administrators can list and revoke pending intents. Resend must rotate
the Keycloak link and update the corresponding intent. Expired and revoked
intents cannot be accepted. The provider link expiry and Core intent expiry
must be reconciled; Core's 24-hour limit remains a ceiling even if the provider
uses a shorter default.

## Alternatives

- **Core-owned token and Core-delivered email:** preserves the original design,
  but requires a separate safe identity-enrollment path and mail sender. It
  duplicates Keycloak's invitation ceremony.
- **Grant on provider membership alone:** leaves no Core confirmation point for
  the requested role and applications, and cannot make them atomic.

## Consequences and release gates

This proposal supersedes only the Core-owned invitation-secret and resend
mechanism in the current organization security design if accepted. The verified
email, exact organization, explicit Core POST, pending-deny, and no-secret-log
invariants remain. Core cannot inspect or reconstruct the provider link.

Before real-user release, prove wrong-account handling, concurrent single use,
provider invitation expiry configuration, least-privilege runtime service
permissions, callback/session behavior, resend serialization, and recovery
after partial failure. Define and approve bounded retention/deletion for
invitation personal data, mail send limits and suppression, whether the
organization name appears in email, and query-string redaction for Keycloak
Admin REST traffic. CRM's existing authentication remains unchanged.

## Decision owners

- Product and invitation UX: product owner; requested, implementation pending.
- Engineering and security: human engineering/security owner; pending.
- Privacy, retention and email disclosure: human Privacy & GDPR Lead; pending.
