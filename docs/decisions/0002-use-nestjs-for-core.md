# ADR 0002: Use NestJS for the Core API

- Status: Accepted
- Date: 2026-10-21

## Context

Core needs a structured API for application registration, product organizations,
entitlements, installation state, integrations, and audit. Identity is delegated
to Keycloak. The team is familiar with Node.js, while Bubllio frontends already
use TypeScript.

## Decision

Use Node.js 24 LTS, TypeScript, NestJS, and the Fastify adapter for the Core API.
The accepted identity foundation lives in `apps/api`. PostgreSQL data access,
OpenAPI generation, and production observability remain separate implementation
decisions and must be introduced only with their first product use case.

## Alternatives considered

- Django/DRF: proven in CRM and operationally familiar, but Core no longer needs
  Django's built-in credential system and the team wants TypeScript end to end.
- FastAPI: concise, typed, and strong for Python APIs, but would require more
  project-level architecture choices while providing less workflow familiarity.
- Bare Fastify/Express: smaller runtime abstraction, but less built-in structure
  for a long-lived modular control plane.

## Consequences

- Core frontend and backend use TypeScript, improving local developer context.
- Nest modules provide explicit bounded-context structure.
- The suite intentionally supports more than one backend stack; contracts and
  observability must remain language-neutral.
- Library and ORM selection remain separate decisions after the spike.

