# ADR 0004: Split identity and product organization ownership

- Status: Proposed
- Date: 2026-10-21

## Context

Keycloak needs an organization context for authentication, membership,
invitations, and token claims. Core needs an organization context for application
availability, entitlements, installation state, and suite settings. Making either
system own both concerns would couple product behavior to identity internals or
duplicate credential-related state in Core.

## Decision

Keycloak owns identity organizations and membership. Core owns the corresponding
product organization and stores the immutable Keycloak organization ID. Domain
applications keep local organization records linked to the Core and identity
identifiers required by their authorization boundary.

Organization provisioning is an idempotent multi-system workflow with observable
partial state, retry, and carefully bounded compensation.

## Alternatives considered

- Core-only organizations mirrored into flat Keycloak groups: more product
  control, but duplicates membership and ignores Keycloak's organization model.
- Keycloak-only organizations: simpler identity setup, but makes identity
  configuration the home for product installations, entitlements, and lifecycle.
- Duplicate organizations synchronized by events alone: eventual consistency is
  useful after creation, but insufficient as the only provisioning control.

## Consequences

- Every product organization has a stable identity-organization link.
- Provisioning cannot rely on one database transaction.
- Reconciliation and operator-visible failure states are mandatory.
- Domain permissions remain inside the application that understands them.

