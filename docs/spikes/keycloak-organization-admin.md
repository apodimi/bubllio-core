# Keycloak organization administration spike

- Status: In progress
- Date: 2026-10-23
- Target: Keycloak 26.8.1

## Question

Can Core find an organization by an immutable custom attribute and use a runtime
service account that can create organizations and add existing users as members
without receiving broad realm-administration privileges?

## Documentation evidence

The Keycloak 26.8.1 Server Administration Guide documents organization
attributes and an organization search request whose `attributes` filter accepts
custom attribute criteria. The Admin REST API documents the corresponding
organization search query as `key1:value1 key2:value2`. This supports the planned
`bubllio.core.organization_id:<core UUID>` reconciliation marker at the API
contract level.

Keycloak 26.8.1 also exposes dedicated `query-organizations`,
`view-organizations`, and `manage-organizations` roles. Fine-grained admin
permissions can grant `view` and `manage` scopes for Organizations, and creating
an organization requires `manage` at the organization resource-type level.

These documents do not by themselves prove the exact minimum permission set for
adding an existing user as an organization member. User visibility and
membership mutation may require additional narrowly delegated Users permissions.
The runtime permission boundary therefore remains unproven until negative
contract tests run against the pinned local image.

## Proposed marker contract

- Attribute key: `bubllio.core.organization_id`
- Attribute value: the immutable Core organization UUID
- Core writes the marker at Keycloak organization creation.
- Reconciliation searches by the exact marker before considering creation.
- Exactly one result is required. Zero results may create; multiple results are
  `NEEDS_ATTENTION` and block mutation.
- Alias or display-name equality is never sufficient to adopt an organization.
- A 409 creation response triggers one marker re-read. A matching marker resumes;
  a missing or different marker is `KEYCLOAK_ORGANIZATION_CONFLICT`.

## Candidate runtime permission set

Begin contract testing with organization query/view/manage plus only the user
view and organization-membership scopes required by the actual member endpoint.
Do not assign `realm-admin`, `manage-realm`, `manage-clients`, `manage-users`,
`impersonation`, or password-reset permission as a shortcut.

Positive tests must prove:

1. exact marker lookup;
2. organization creation with the marker;
3. adding an existing exact-subject user as an unmanaged member; and
4. treating existing organization/member state as idempotent success.

Negative tests must prove the same service account cannot:

1. change realm configuration;
2. create, update, or delete clients;
3. create users or reset credentials;
4. impersonate users;
5. manage identity providers or events;
6. assign realm/client roles; or
7. delete arbitrary organizations or memberships outside its policy.

## Current result

The immutable marker lookup is supported by the documented 26.8.1 API. The
minimum write permission set is not yet proven locally. Production remains
blocked until the pinned-image contract tests establish the positive and
negative boundary. Broad `realm-admin` access is not an acceptable interim
configuration.

## References

- [Keycloak 26.8.1 Server Administration Guide](https://www.keycloak.org/docs/26.8.1/server_admin/)
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/)
- [Keycloak bootstrap administrator recovery](https://www.keycloak.org/server/bootstrap-admin-recovery)
