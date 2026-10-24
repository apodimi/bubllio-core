# Cross-application contracts

This page defines the initial communication rules between Core, CRM, Board, and
future Bubllio applications.

## Contract types

| Need | Contract |
| --- | --- |
| Authenticate a person | OIDC through Keycloak |
| Authenticate a service | narrowly scoped OAuth client credentials |
| Decide whether a member may enter an app | Core's versioned app-access API |
| Read current user-visible data | REST API |
| Publish a durable state change | versioned integration event |
| Describe an API | OpenAPI |
| Refer to data owned by another app | external resource reference |

Applications never read or write another application's database.

## Developer path for a new app

The target integration has four steps:

1. Add a reviewed app key, name, launch URL, OIDC audience, and contract version
   to the deployment application manifest.
2. Configure the app to use the suite sign-in through the published adapter.
   Keycloak provides login and recovery; Core provides the shared integration,
   organization invitations, and app grants. The app does not create a parallel
   user-management flow.
3. Add the standard backend middleware that validates the token and asks Core
   whether this subject may enter this app in this organization.
4. Run the Core conformance suite, then implement only the app's own data and
   action permissions.

Core's workspace shows the app only to members with an active grant. Opening an
app from Core reuses the identity session and supplies the selected Core
organization ID as the `organization_id` query parameter. This value is only a
navigation hint: the app must verify the token's exact identity-organization
membership and Core access decision before serving tenant data. Opening an app
directly performs the same backend access check. The portable deployment adapter
and its installation conformance checks are implemented. The reusable
application integration adapter and CRM adoption are still pending.

## Required application-access contract

ADR 0009 defines the authority. Core now publishes the
[`core-access-v1.openapi.yaml`](../contracts/core-access-v1.openapi.yaml)
workspace and access-decision contract. The Core endpoints are implemented;
application adapters and CRM adoption are still pending.

1. The application ships a stable app key and reviewed integration metadata.
   A deployment operator supplies its exact audience, launch URL, and compatible
   contract version through the installation manifest; Core reconciles that
   catalog at startup.
2. Core records whether the app is installed, entitled, and enabled for each
   organization, then records explicit grants to individual members. All grant
   changes are authorized and audited in Core.
3. Keycloak authenticates the person and proves identity-organization
   membership. The app backend validates its own token audience and the exact
   organization ID in the route.
4. Before serving tenant data, the app backend asks Core for the current
   subject's decision for its own app key and organization. It forwards the
   original user token to Core over the trusted backend connection; Core
   validates its own audience and derives the subject from that token. The
   identity configuration must issue a token accepted by both the app and Core
   for this flow. A caller cannot supply a different subject or an `allowed`
   flag.
5. The app enforces its own roles and record permissions after Core allows
   entry. If Core denies, is unavailable beyond a reviewed cache lifetime, or
   returns an invalid response, the app denies tenant access.

The Core launcher uses the same grant source to show available apps. A user may
open an app directly, so the launcher is never an authorization boundary. A
developer can have Board alone, a salesperson CRM alone, and a project manager
both in the same organization.

Onboarding a new app adds a catalog entry and an adapter for this shared
identity/access contract. It does not copy all users into Core credentials,
read another app's database, or move app-specific roles into Core. App URLs,
audiences, keys, contract versions, and revocation/cache behavior are versioned
contracts and require consumer tests before release. Core will publish a small
conformance suite so a new app can prove valid
identity, allowed/denied grants, wrong-organization rejection, and Core-outage
behavior without copying the CRM implementation.

## External resource reference

When Board exists, it can link an issue to a CRM company using identity rather
than copied domain data:

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

