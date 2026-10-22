# ADR 0007: Use Prisma with PostgreSQL for Core persistence

- Status: Accepted
- Date: 2026-10-22

## Context

Core needs durable organization state, suite roles, provisioning progress,
invitations, access requests, idempotency records, and security audit events.
The team needs type-safe access and a migration workflow without introducing a
generic repository layer before there is a second implementation.

## Decision

Core uses its own PostgreSQL database with Prisma ORM 7 and committed SQL
migrations. Identifiers are UUIDs, timestamps are stored as `timestamptz`, and
security-critical uniqueness and state constraints live in PostgreSQL as the
final concurrency boundary.

The NestJS integration is one small database provider. Feature-specific
repositories are introduced only where they form a real testing or external
system boundary.

## Alternatives considered

- TypeORM: mature NestJS integration, but entity decorators couple persistence
  shape to domain objects and make migrations easier to generate implicitly.
- Handwritten SQL: maximum control, but adds repetitive mapping before Core has
  enough query complexity to justify it.
- A shared suite database: rejected by ADR 0003 because it weakens ownership,
  backup, migration, and rollback boundaries.

## Consequences

- Prisma Client is generated during API builds and is not committed.
- Production deployments run `prisma migrate deploy` as a separate migration
  step before starting the new API version.
- Explicit SQL remains appropriate for constraints, locking, and worker claim
  queries that Prisma cannot express safely.
- Prisma and its PostgreSQL driver adapter are pinned and upgraded deliberately.
