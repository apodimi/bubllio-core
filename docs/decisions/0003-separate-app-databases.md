# ADR 0003: Give each application its own database

- Status: Proposed
- Date: 2026-10-21

## Context

Core, CRM, and Board have different domain ownership and release lifecycles.
Sharing tables would allow short-term shortcuts but couple migrations, rollback,
permissions, backups, and application availability.

## Decision

Each application owns a separate PostgreSQL database or database-level isolation
with separate credentials and no cross-application table access. Applications
communicate through authenticated, versioned contracts.

## Alternatives considered

- One shared schema: simple initial joins, but weak ownership and coupled schema
  evolution.
- One PostgreSQL database with separate schemas: potentially acceptable for a
  constrained installation, but only if credentials and ownership remain
  isolated and no cross-schema application queries are permitted.

## Consequences

- Cross-app views require APIs, events, or deliberate projections.
- Applications can migrate and restore independently.
- Local and production orchestration must manage multiple databases or isolated
  schemas and credentials.
- Reporting across the suite becomes a later integration concern, not a reason
  to break domain ownership.

