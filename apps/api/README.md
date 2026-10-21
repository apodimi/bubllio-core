# Bubllio Core API

This is the NestJS resource server and future control-plane API for Bubllio.
The current implementation intentionally contains only the verified identity
foundation; product modules will be added vertically as their contracts mature.

## Structure

```text
src/
├── app.module.ts              application composition root
├── health.controller.ts       public readiness endpoint
├── main.ts                    Fastify bootstrap
└── auth/                      one cohesive authentication feature
    ├── auth.module.ts         global guard registration
    ├── auth.service.ts        configuration and verifier lifecycle
    ├── identity.types.ts      trusted application identity contracts
    ├── me.controller.ts       minimal authenticated proof endpoint
    ├── decorators/
    │   ├── current-identity.decorator.ts
    │   └── public.decorator.ts
    ├── guards/
    │   └── authentication.guard.ts
    └── oidc/
        ├── oidc-claims.parser.ts
        ├── oidc-token.verifier.ts
        ├── oidc.config.ts
        └── oidc.types.ts
```

Directories describe technical responsibilities inside the cohesive `auth`
feature. Avoid deeper nesting until a real second implementation makes the
current boundary ambiguous.

## Security boundary

- Routes are protected by the global guard unless marked `@Public()`.
- Controllers consume `@CurrentIdentity()` and never parse tokens.
- The verifier checks signature, issuer, audience, expiry, subject, and the
  currently validated organization claim contract.
- Client responses reveal only that authentication failed. Server logs record
  the error class, never the token or token claims.
- Organization-resource matching and domain permissions belong in separate
  authorization guards once those resources exist.

## Deliberate non-goals

- No Passport layer for a single Bearer-token mechanism.
- No Keycloak-specific Connect/Express adapter in the Fastify application.
- No CQRS, repository, shared-kernel, or configuration framework before the
  production domain needs one.
- No reusable auth package before both NestJS and Django integrations reveal a
  genuinely shared contract.
