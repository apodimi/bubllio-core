# Identity and organization ownership

This page defines the proposed boundary between Keycloak identity data and Core
product data. ADR 0004 must be accepted before this becomes an implementation
contract.

## Ownership

Keycloak owns authentication identity and membership:

- credentials and recovery;
- sessions, MFA, passkeys, and external identity providers;
- the immutable user subject (`sub`);
- identity organizations and organization membership;
- OAuth/OIDC clients and machine identities.

Core owns the product representation of an organization:

- enabled, suspended, or onboarding product state;
- installed and available Bubllio applications;
- entitlements and compatibility state;
- suite preferences that are not identity-provider configuration;
- the immutable link to the Keycloak organization ID.

Applications own domain roles and capabilities. Keycloak membership answers
"may this identity enter this organization?" It does not by itself answer "may
this member delete a CRM company or administer a Board project?"

## NestJS resource-server convention

Core APIs are authenticated by default. A global NestJS `APP_GUARD` validates
Bearer access tokens through the OIDC issuer's JWKS and attaches a reduced,
validated identity to the request.

- Mark the small set of unauthenticated endpoints with `@Public()`; do not add
  authentication decorators separately to every protected controller.
- Read the verified principal through `@CurrentIdentity()`; controllers must not
  decode tokens or reach into raw request headers.
- Keep signature, issuer, audience, expiry, subject, and organization validation
  in the authentication service.
- Add organization and domain-permission guards separately. Authentication alone
  does not authorize access to a tenant resource.
- Never expose token-validation internals or the raw token in client errors or
  application logs.

## Identity mapping

Every application stores stable external identifiers rather than matching by
email or username:

```text
keycloak_subject       immutable user identity (`sub`)
keycloak_organization  immutable identity organization ID
core_organization      immutable Bubllio product organization ID
```

Email and display name can change and must not be used as relational keys.

## Provisioning consistency

Organization creation crosses the Keycloak and Core boundary and cannot be one
database transaction. The initiating workflow must:

1. use an idempotency key;
2. create or resolve the Keycloak organization;
3. persist the Core organization and external ID;
4. record durable progress;
5. retry safe failures;
6. surface partial state for operator repair;
7. use compensation only when deleting the identity organization is proven safe.

## Token expectations to validate in the spike

- Authorization Code with PKCE for browser clients.
- Short-lived access tokens.
- Exact issuer validation.
- Explicit audience validation per resource server.
- Organization context using supported Keycloak organization scopes/claims.
- Refresh-token rotation and revocation behavior.
- JWKS-based signature validation and signing-key rotation.
- A documented logout model for application and identity-provider sessions.
- Narrow service credentials for machine-to-machine calls.

The exact claim shape is not final until captured from the selected Keycloak
version during the spike.

## CRM migration constraint

The CRM currently owns Django users and issues SimpleJWT tokens. Migration must
be additive first:

1. accept and validate Keycloak tokens on an isolated path;
2. map Keycloak subjects to existing local users explicitly;
3. test existing and new authentication paths side by side;
4. provide an account-enrollment or reset path when password hashes cannot be
   migrated safely;
5. remove SimpleJWT issuance only after rollback and support requirements are
   satisfied.

