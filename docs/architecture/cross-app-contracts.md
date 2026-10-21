# Cross-application contracts

This page defines the initial communication rules between Core, CRM, Board, and
future Bubllio applications.

## Contract types

| Need | Contract |
| --- | --- |
| Authenticate a person | OIDC through Keycloak |
| Authenticate a service | narrowly scoped OAuth client credentials |
| Read current user-visible data | REST API |
| Publish a durable state change | versioned integration event |
| Describe an API | OpenAPI |
| Refer to data owned by another app | external resource reference |

Applications never read or write another application's database.

## External resource reference

Board links an issue to a CRM company using identity, not copied domain data:

```json
{
  "provider": "bubllio-crm",
  "resource_type": "company",
  "resource_id": "00000000-0000-0000-0000-000000000000"
}
```

The reference is meaningful only inside the authenticated organization context.
The provider validates membership and domain authorization before resolving it.

## Resource summary

CRM may expose a display-oriented summary contract:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "type": "company",
  "label": "Example Company",
  "url": "/organizations/00000000-0000-0000-0000-000000000000/companies/00000000-0000-0000-0000-000000000000",
  "metadata": {
    "lifecycle_stage": "customer"
  }
}
```

Summary fields must be intentionally public to authorized suite consumers. Board
must tolerate missing, inaccessible, deleted, or temporarily unavailable linked
resources.

## Compatibility

- Version public APIs under `/api/v1/`.
- Prefer additive changes within a version.
- Deprecate before removing a field or endpoint.
- Generate consumers from published OpenAPI only when generation improves, not
  hides, the contract.
- Version event schemas and make consumers ignore unknown additive fields.
- Record minimum compatible application versions in Core before automated
  installation or upgrades are introduced.

## Events

Events are not required for the first resource-link slice. When introduced:

- publish through a transactional outbox;
- include event ID, schema version, occurred-at time, organization ID, producer,
  and resource identity;
- exclude secrets and unnecessary personal data;
- make consumers idempotent;
- define retry, dead-letter, replay, and retention behavior.

