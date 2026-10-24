# Architecture decisions

Decision status meanings:

- `Proposed` — under evaluation; not an implementation contract.
- `Accepted` — approved for implementation.
- `Superseded` — replaced by a later ADR.
- `Rejected` — considered but deliberately not selected.

| ADR                                                | Status   | Decision                                          |
| -------------------------------------------------- | -------- | ------------------------------------------------- |
| [0001](0001-use-keycloak-for-identity.md)          | Accepted | Use Keycloak for suite identity                   |
| [0002](0002-use-nestjs-for-core.md)                | Accepted | Use NestJS for the Core API                       |
| [0003](0003-separate-app-databases.md)             | Accepted | Give each application its own database            |
| [0004](0004-organization-ownership.md)             | Accepted | Split identity and product organization ownership |
| [0005](0005-use-elastic-license-2.md)              | Accepted | Use the Elastic License 2.0                       |
| [0006](0006-use-keycloakify-for-identity-theme.md) | Accepted | Use Keycloakify for the identity theme            |
| [0007](0007-use-prisma-for-core-persistence.md)    | Accepted | Use Prisma with PostgreSQL for Core persistence   |
| [0008](0008-secure-first-run-setup.md)             | Accepted | Require dual-proof, durable first-run setup       |
| [0009](0009-central-application-access.md)         | Accepted | Centralize per-member application access in Core  |
| [0010](0010-general-browser-registration.md)       | Proposed | Allow permanent verified browser identity signup  |
