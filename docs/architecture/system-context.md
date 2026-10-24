# System context

This page defines how Bubllio Core fits into the suite and where authoritative
data lives.

## Context

```text
                           Browser
                              │
                  OpenID Connect login/session
                              ▼
                         Keycloak
                    identity and membership
                              │
              signed tokens with organization context
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
     Bubllio Core        Bubllio CRM         Bubllio Board
     app control         customer work       issue tracking
          │                   │                   │
          ▼                   ▼                   ▼
      Core database       CRM database        Board database
```

Each application owns its database and validates the identity token at its API
boundary. No application proves authorization merely by receiving a user,
organization, or resource identifier.

The target suite also requires each application backend to check Core's
per-member application grant for the exact organization and application key.
The launcher and the application API use the same decision. Board is planned;
CRM still uses its own authentication until its additive migration is released.

## Systems of record

| Information | Authoritative owner |
| --- | --- |
| Credentials, login sessions, MFA, identity federation | Keycloak |
| Identity organization membership | Keycloak |
| Product organization state | Bubllio Core |
| Application catalog, organization availability, and member app grants | Bubllio Core |
| Entitlements and installation state | Bubllio Core |
| Actions and roles inside an application | Owning application |
| Companies, contacts, deals, billing | Bubllio CRM |
| Projects, boards, issues, comments | Bubllio Board |
| Public product presentation | Bubllio Web |

## Proposed deployment shape

The first target is one self-hosted suite installation with independently
deployable application containers and isolated PostgreSQL databases. A shared
reverse proxy exposes application URLs; private databases and brokers are never
published directly.

Cloud control-plane behavior, third-party modules, and one Core serving multiple
independent installations are later design problems.

## Runtime principles

- One Keycloak realm represents the Bubllio suite installation.
- Keycloak clients represent Core, CRM, Board, and approved machine clients.
- Applications may release independently within an explicit compatibility
  window.
- Synchronous user actions use versioned REST APIs.
- Events communicate durable facts, not commands disguised as events.
- A failed optional application must not prevent authentication to healthy apps.
- Core access decisions are required before serving tenant data from an
  integrated application. Core failure beyond any reviewed cache lifetime
  denies new app access rather than silently allowing it.

