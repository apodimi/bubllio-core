# Bubllio Core product definition

## Product purpose

Bubllio Core is the required control plane for the Bubllio suite. A person signs
in once, enters an organization, sees only the applications granted to them
there, and moves between those applications without losing identity or
organization context. Each application checks Core access even when opened by
direct URL.

## Primary users

- Organization members who use more than one Bubllio application.
- Organization administrators who manage membership and application access.
- Installation administrators who operate a self-hosted Bubllio suite.
- Bubllio application developers who integrate a module into the suite.

## Target first journey

An installation operator starts the versioned Bubllio distribution through the
adapter for their infrastructure. The reference release is one downloadable
bundle: with Docker, a base domain, and a reverse-proxy network, the operator
prepares generated state, checks it, and starts the suite without a source
checkout, Node, Keycloak administration, or manual migrations. The operator
securely hands the one-time setup secret to the named IT administrator. Once
the HTTPS endpoint is reachable, ordinary product setup happens in the browser.
Before sign-in, the operator checks the system, configures email delivery, and
creates the first verified administrator. After sign-in, that administrator
enters the Core shell and completes a short, server-driven task list: prove
installation authority, create the first organization, and activate owner
access. The normal application workspace remains unavailable until final
readiness.

The applications present in an installation come from its reviewed deployment
manifest. Core does not install containers or execute deployment commands. It
shows the available applications and manages member access after setup. A
developer receives Board access, a salesperson CRM access, and a project
manager both, without changing their shared organization membership. Board is
a future application; CRM is the first real integration target.

Managed hosting panels may replace the bundle's host-side preparation with a
thin release adapter. The operator supplies only the base domain and one unique
setup secret; the adapter derives and durably stores every internal credential,
runs migrations, and starts the same browser setup. This does not make the
hosting panel part of Core or weaken the one-time proof against first-visitor
takeover.

## Core workspace experience

Core is the suite home after sign-in, similar to an application workspace. A
member chooses an organization, sees only the apps granted there, and opens one
with the same identity session. Owners and admins use Core to invite members,
enable apps for the organization, and grant or revoke each member's app access.
An ungranted app remains inaccessible through its direct URL and API.

Browser registration creates a verified suite identity. It does not create an
organization, establish membership, or grant applications. A new user waits for
an organization invitation and explicit access decisions from an administrator.

## New application experience

A developer registers an app with Core, configures its launch URL and identity
audience, and uses the published integration adapter and contract tests. They do
not build another login, password reset, organization invitation flow, member
directory, or app-access policy. Their backend still validates the standard
token and enforces Core's grant before serving tenant data. The app owns only
its domain data and action-level permissions.

## Core responsibilities

- Integrate with the suite identity provider.
- Represent the product state of an organization.
- Maintain the application catalog and organization app availability.
- Maintain explicit application grants for each organization member and expose
  authoritative access decisions to application backends.
- Maintain entitlements and installation/provisioning state.
- Publish suite-level discovery and compatibility information.
- Define contracts for cross-application resource references.
- Record security-sensitive suite administration events.

## Non-responsibilities

- Core does not store passwords or implement an OAuth/OIDC provider.
- Core does not own CRM companies, contacts, deals, billing, or tasks.
- Core does not own Board projects, issues, comments, or workflows.
- Core does not centralize every application permission.
- Core does not execute arbitrary deployment commands supplied through its UI.
- Core does not require all applications to use the same implementation language.

## Product principles

- One identity and organization context across the suite.
- Organization membership and application access are separate decisions.
- Every application enforces Core access before its own domain permissions.
- A new app uses the same small integration contract regardless of its stack.
- One authoritative owner for every piece of data.
- Standards-based contracts over shared database access.
- Self-hosted operation first; hosted operation must remain possible.
- One canonical deployment contract must work across infrastructures through
  thin adapters; product behavior must not depend on a hosting vendor.
- Infrastructure bootstrap must stay minimal. Once Bubllio is reachable, the
  normal administrator configuration experience belongs in the product UI.
- Release delivery asks only for environment-owned facts. Image digests,
  credentials, filenames, health defaults, and internal topology are derived
  from the release and never become operator questionnaire fields.
- Deployment manifests install applications; Core presents them and manages
  access but is not an application installer or marketplace.
- Safe staggered upgrades between independently released applications.
- Installation should become approachable without hiding security or backup
  requirements.
- Current behavior and future plans must remain visibly separate.

## First milestone success criteria

- A clean self-hosted installation completes secure setup and enters Core.
- The happy-path administrator setup after the HTTPS endpoint is reachable
  requires no Keycloak console, source edits, or manual database migration.
- A failed setup dependency can be corrected and retried without reinstalling
  or losing the durable setup operation.
- Tokens have validated issuer, audience, expiry, and organization context.
- The owner can manage Core organization state, membership, and application
  availability and individual member grants without touching Keycloak
  infrastructure credentials.
- A member sees only granted applications, and a direct URL/API call to an
  ungranted application is denied by its backend.
- Tests cover two members and two app keys in one organization, proving
  different grant sets even before Board exists.
- A reference app can join through documented configuration and the shared
  access adapter without building its own login or invitation workflow.
- Cross-organization access is denied and covered by regression tests.
- Local setup is repeatable from documented container commands.
- Logout, token refresh, signing-key rotation, provisioning reconciliation, and
  service authentication have explicit test evidence.

The suite is not complete until CRM accepts the shared identity and Core app
grant while preserving a tested transition from its existing login. Board uses
the same contract later, without changing Core's access model.
