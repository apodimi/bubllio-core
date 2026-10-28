# Bubllio Core documentation

The Core documentation is organized by purpose:

- [Suite architecture](architecture/suite-architecture.md) explains the current
  Core, CRM, identity, Web, and deployment boundaries versus the target model.

- [`architecture/`](architecture/) describes the proposed system boundaries and
  contracts.
- [`decisions/`](decisions/) records choices and their consequences.
- [`spikes/`](spikes/) defines time-boxed experiments and their evidence.
- [`deployment/`](deployment/) documents environment setup, release promotion,
  and operational safety gates.
- [`development/`](development/) contains the fresh-clone developer workflow,
  component feedback loops, verification gates, and troubleshooting.
- [`contracts/`](contracts/) contains versioned machine-readable API contracts.
- [`contracts/core-access-v1.openapi.yaml`](contracts/core-access-v1.openapi.yaml)
  defines the implemented workspace and app-access API for future consumers.
- [`operations/`](operations/) contains safe installation and recovery runbooks.
- [`next-session.md`](next-session.md) records the current handoff and the first
  concrete step for the next working session.

Implemented behavior must not be inferred from a proposed ADR or spike plan.
The root `README.md` states the current project phase.

New contributors should begin with the
[developer getting-started guide](development/getting-started.md).
