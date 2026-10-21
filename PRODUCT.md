# Bubllio Core product definition

## Product purpose

Bubllio Core makes independently deployable Bubllio applications feel like one
suite. A person signs in once, enters an organization, sees the applications
available to it, and moves between those applications without losing identity
or organization context.

## Primary users

- Organization members who use more than one Bubllio application.
- Organization administrators who manage membership and application access.
- Installation administrators who operate a self-hosted Bubllio suite.
- Bubllio application developers who integrate a module into the suite.

## First validated journey

An organization member signs in once, opens CRM and Board, creates a Board task,
and links it to a CRM company belonging to the same organization. The link shows
current display information from CRM without copying the CRM company into Board.

## Core responsibilities

- Integrate with the suite identity provider.
- Represent the product state of an organization.
- Maintain the application catalog and organization app availability.
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
- One authoritative owner for every piece of data.
- Standards-based contracts over shared database access.
- Self-hosted operation first; hosted operation must remain possible.
- Safe staggered upgrades between independently released applications.
- Installation should become approachable without hiding security or backup
  requirements.
- Current behavior and future plans must remain visibly separate.

## First milestone success criteria

- One login works across Core, CRM, and a minimal Board client.
- Tokens have validated issuer, audience, expiry, and organization context.
- CRM can accept the new identity path without breaking its current login path.
- Board can resolve an allowed CRM company summary through a documented API.
- Cross-organization access is denied and covered by regression tests.
- Local setup is repeatable from documented container commands.
- Logout, token refresh, signing-key rotation, and service authentication have
  explicit test evidence.

