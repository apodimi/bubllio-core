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

## Local 26.8.1 evidence

An isolated Compose realm was exercised on 2026-10-23. A service account with
`query-organizations`, `view-organizations`, and `manage-organizations` created
an organization, resolved its exact Core ID marker, and could send an invitation
to an existing user. It could not list clients. Directly adding that user as a
member returned 403: [the pinned Keycloak source](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/organization/admin/resource/OrganizationMemberResource.java)
requires both organization management and user management for that operation.
The first local rehearsal therefore sends an owner invitation and waits for the
human to accept it. It does not grant runtime `manage-users` or `realm-admin`.

The local rehearsal also grants `view-users` so the runtime can verify that the
invitation was accepted. This exposes realm-wide user read access to that local
service account. It is not an approved production permission boundary. Before
UAT, replace it with tested fine-grained access to only the necessary user and
prove that realm, client, password, impersonation, and unrelated-user mutations
remain unavailable. The local smoke used a temporary organization and an
isolated database; no production permission result is implied.

## References

- [Keycloak 26.8.1 Server Administration Guide](https://www.keycloak.org/docs/26.8.1/server_admin/)
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/)
- [Keycloak bootstrap administrator recovery](https://www.keycloak.org/server/bootstrap-admin-recovery)
