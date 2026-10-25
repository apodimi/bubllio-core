# ADR 0009: Core owns access to suite applications

- Status: Accepted
- Date: 2026-10-23

## Context

One organization can use several Bubllio applications and have many members.
Organization membership alone cannot mean access to every application: a
developer may need Board only, a salesperson CRM only, and a project manager
both. A launcher that hides an icon without enforcing the same rule at each
application API would leave direct URLs and API calls open.

New applications should join the suite through a stable integration contract
instead of rebuilding user invitations, organization membership, and application
access management. The current CRM has its own Django authentication and
membership model, so adoption must preserve a tested compatibility path.

## Decision

Core is the authoritative control plane for **which application a member may
enter in a given organization**. Keycloak remains the authority for identity,
sessions, and identity-organization membership. Each application remains the
authority for permissions and data inside that application.

The access hierarchy is:

```text
installation
  └─ organization
       ├─ members (immutable Keycloak subjects)
       ├─ available applications (stable application keys)
       └─ explicit member × application grants
```

An application is usable only when all of these are true:

1. the caller has a valid token with the exact immutable identity-organization
   ID for the requested active Core organization;
2. the application is registered, installed, enabled for that organization, and
   allowed by its entitlement;
3. Core has an active, explicit grant for that subject, organization, and
   application; and
4. the application allows the requested action under its own domain rules.

No suite role, Keycloak organization membership, application installation, or
entitlement grants application access by itself. An owner can administer grants
according to Core policy but receives no automatic access to CRM or another
application. Missing or suspended grants deny access by default.

The Core console itself is the control plane, not a grantable catalog app.
Authenticated organization members can see their own launcher/profile; Core
suite roles control administration. This lets the first owner configure app
access without a bootstrap grant and avoids a self-lockout loop.

Core shows a member only the applications they can use. Every application API
must enforce the same Core decision for tenant routes, including requests that
bypass the launcher. An application backend obtains the decision directly from
Core using the validated user's token and the requested organization; it never
trusts a browser-provided `allowed` value. The first integration uses a short,
bounded positive cache only if revocation delay and Core outage behavior are
tested and documented. Expired or unavailable decisions fail closed. Exact
endpoint and cache duration belong to the versioned contract.

Adding an application requires a reviewed catalog entry with a stable key,
versioned integration metadata, exact launch URL and OIDC audience/client
configuration. The application implements the shared identity and Core access
contract. Core then manages organization availability and member grants; it
does not run arbitrary application code or own application records.

Core's browser UI is the suite workspace: organization selector, granted-app
launcher, and member/app-access administration. A new app reuses the suite's
sign-in, recovery, membership, and grant workflows. It needs a small standard
integration at its API boundary because an API must verify its own audience and
enforce the Core decision; the developer should not invent a new auth model.
Core publishes a versioned contract, reference adapters for supported stacks,
and conformance tests to make this integration routine.

## Alternatives considered

- Keycloak organization membership grants all installed apps: rejected because
  members need different app sets within the same organization.
- Put app grants only in Keycloak roles or token claims: rejected because Core
  needs an authoritative, auditable product access model and timely revocation.
- Let each application manage its own entry grants: rejected because adding an
  app would duplicate central membership and access workflows.
- Use the Core launcher as the only gate: rejected because direct app URLs and
  API requests would bypass it.

## Consequences and rollout

- Core needs an application catalog, organization availability, per-member app
  grants, audited grant changes, and a versioned access-decision API.
- Organization owners and admins manage grants under explicit policy; Core
  must prevent removal of the final owner without implying app access.
- Each application validates OIDC and enforces Core access before its local
  domain permissions. Core availability becomes a suite availability concern.
- New or revoked access is bounded by the documented cache lifetime; emergency
  removal also revokes identity sessions.
- CRM migrates additively from SimpleJWT/local memberships, with explicit stable
  identity mapping and old/new paths tested side by side. Core is not considered
  a required production dependency for CRM until that migration is released.
- Board does not need to exist to finish the Core contract. It will use the same
  integration path when built.

## Cross-project impact

| Concern | Plan |
| --- | --- |
| Primary owner | `bubllio-core` owns catalog, availability, grants, and decisions. |
| Consumers | CRM backend and frontend first; later every suite application. |
| Contract | Add a versioned Core access-decision API and stable app keys; add a Core decision check at each app API boundary. |
| Compatibility | Keep CRM's current SimpleJWT path during additive identity and organization mapping; migrate users explicitly before removing it. |
| Verification | Test two members in one organization with different app grants, direct URL/API denial, two-organization isolation, revocation, Core outage, and old/new CRM paths side by side. |
| Release order | Ship and verify Core authority first, add CRM consumer behind an isolated compatibility path, then make Core grants mandatory only after migration and rollback evidence. |
