# Identity and organization ownership

This page defines the accepted boundary between Keycloak identity data and Core
product data. ADR 0004 defines organization ownership; ADR 0009 defines
application access. Implementation is still incremental.

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
- explicit application grants for each organization member;
- entitlements and compatibility state;
- suite preferences that are not identity-provider configuration;
- the immutable link to the Keycloak organization ID.

Applications own domain roles and capabilities. Keycloak membership answers
"does this identity belong to this organization?" Core answers "may this
member enter this application in this organization?" The application answers
"may this member perform this action on this record?" These are three separate
checks. A Core suite role never grants app access automatically.

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
- Treat an absent or empty organization claim as valid only for an authenticated
  subject that has not joined an organization yet. Tenant guards still reject
  that empty context.
- First-run requires a recent verified email. Prefer validated token claims;
  when an existing realm omits those optional claims, Core confirms the same
  immutable subject through its private, read-only Keycloak user lookup rather
  than weakening the requirement or trusting browser input.
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

