# ADR 0010: General browser registration for suite identity

- Status: Withdrawn on 2026-10-28; invite-only enrollment replaces this proposal
- Date: 2026-10-24

## Context

The first-run rehearsal enabled Keycloak self-registration only so the first
administrator could create an account in the browser. Bubllio users should be
able to create one verified suite identity after installation as well. Account
creation and organization access are separate decisions.

## Proposed decision

Allow browser registration in the Bubllio Keycloak realm as a permanent
identity capability. Require email verification and use email as the username.
A new account has no organization membership, Core role, or application grant.
An organization owner or administrator must invite the person and grant each
application explicitly. Registration never creates an organization.

The first installation claim continues to require the recent verified identity
and out-of-band setup secret from [ADR 0008](0008-secure-first-run-setup.md).
The initial setup screen offers account creation only; after a claim it offers
continuation to the original subject. The ordinary login page offers both
sign-in and registration. Keycloak owns passwords and email verification.

This changes ADR 0008's assumption that the normal realm disables
self-registration. Its rejected alternative was **temporary** unrestricted
registration that had to be closed after setup. Permanent identity registration
has no close-after-setup transition; ADR 0008's two-proof claim and tenant
authorization rules remain in force.

## Release boundary

The local realm and identity UI implement this direction for testing.
Production enablement requires verified SMTP delivery, account recovery,
registration abuse controls, privacy/terms decisions, a tested invitation
journey, and approval from the human product, design, and engineering owners.
Existing CRM registration remains invite-only until its additive identity
migration; the public website must not claim shared registration is available
to CRM users before that migration ships.

## Disposition

The installation owner requested invite-only enrollment after the first
administrator. Public self-registration now closes when that verified
administrator proves the one-time installation secret. This page preserves the
earlier proposal; it is no longer the target behavior. New-member invitation
administration remains a separate product increment. Product decision owner:
installation owner (accepted direction, 2026-10-28). Human engineering and
privacy/legal release reviewers: pending.
