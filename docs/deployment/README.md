# Environment setup and deployment

This guide explains how to obtain and run Bubllio Core locally and defines the
deployment contract for UAT and Production.

> **Current status:** only the local foundation stack is runnable. UAT and
> Production manifests, CI image publication, secret-manager integration, and
> automated realm provisioning are not implemented yet. Never deploy the spike
> Compose file or its demo realm outside a developer machine.

## Environment model

| Concern | Local | UAT | Production |
| --- | --- | --- | --- |
| Purpose | Development and disposable experiments | Production-like validation | Customer traffic |
| Keycloak mode | `start-dev` | `start --optimized` | `start --optimized` |
| Database | Local PostgreSQL container | Dedicated PostgreSQL | Managed/operated HA PostgreSQL |
| TLS | Not required on loopback | Required | Required |
| Secrets | Disposable `.env.example` values | Secret manager | Secret manager with rotation |
| Realm data | Demo import allowed | Automated environment configuration | Reviewed automated configuration |
| Images | Local build | Immutable registry digest | Same tested digest promoted from UAT |
| Availability | Best effort | Production-like | Defined from agreed SLO/RTO/RPO |

## Obtain the repository

This repository does not have a Git remote yet. After the remote is created:

```bash
git clone <repository-url> bubllio-core
cd bubllio-core
```

Use the supported release tag or commit SHA for UAT and Production. Never deploy
directly from an unreviewed working tree or a mutable branch reference.

## Local environment

### Prerequisites

- Docker Desktop or Docker Engine with Compose v2
- Node.js 24 LTS and npm when running API checks outside Docker
- Java 21 and Apache Maven only when building the Keycloak theme JAR outside Docker
- `curl` for smoke checks
- Free loopback ports `8180`, `3100`, and `5174`

### Start

The checked-in `.env.example` contains only disposable local credentials.

```bash
docker compose --env-file .env.example up -d --build
docker compose --env-file .env.example ps
```

Wait until `keycloak-db`, `keycloak`, and `core-api` report `healthy`, then run:

```bash
curl --fail http://127.0.0.1:8180/realms/bubllio/.well-known/openid-configuration
curl --fail http://127.0.0.1:3100/health
```

Local endpoints:

| Service | URL |
| --- | --- |
| Keycloak | <http://127.0.0.1:8180> |
| Keycloak administration | <http://127.0.0.1:8180/admin/> |
| Core API health | <http://127.0.0.1:3100/health> |
| Core web client | <http://127.0.0.1:5174> |

Local-only credentials:

```text
Administrator: admin / local-keycloak-admin-password
Demo user:      spike-user / local-spike-password
```

These values must never appear in UAT or Production.

Run the browser client outside Compose in a second terminal:

```bash
cd apps/web
npm ci
npm run dev
```

The browser uses Authorization Code with PKCE and requires authentication when
it starts. Access and refresh tokens remain in memory; the application does not
persist them in local or session storage. For `/me` to succeed, add the demo
user to one Keycloak organization before signing in.

Fresh local realms select the `bubllio` Keycloakify login theme automatically.
The theme is compiled to a provider JAR while Compose builds the Keycloak image;
it is not a runtime source mount. An existing realm must select it once under
`Realm settings → Themes → Login theme`, because Keycloak does not overwrite an
imported realm on restart.

To iterate on the identity UI, first install its dependencies and build the JAR:

```bash
cd apps/keycloak-theme
npm ci
npm run build:keycloak
```

Then rebuild and recreate Keycloak from the repository root:

```bash
docker compose --env-file .env.example build keycloak
docker compose --env-file .env.example up -d --force-recreate keycloak
```

### Run checks

```bash
cd apps/api
npm ci
npm run format:check
npm test
npm run build

cd ../web
npm ci
npm run format:check
npm run build
npm run test:e2e

cd ../keycloak-theme
npm ci
npm run build:keycloak
```

The web end-to-end checks require the local Compose services and Google Chrome.
Their global setup safely ensures that `spike-user` belongs to the disposable
`demo-workspace` organization and that organization IDs are present in tokens.
It can be run repeatedly without duplicating either fixture.

### Stop or reset

Stop containers while retaining the local database:

```bash
docker compose --env-file .env.example down
```

Delete all disposable local identity data and start again:

```bash
docker compose --env-file .env.example down --volumes
docker compose --env-file .env.example up -d --build
```

The reset command is destructive by design and must never be used against UAT
or Production storage.

## Release artifacts for UAT and Production

CI must build each artifact once and identify it by Git SHA and container digest.
Production promotes the exact artifact that passed UAT; it does not rebuild it.

Required artifacts:

1. A production Core API image built from `apps/api` after its production gates
   are implemented and verified.
2. An optimized Keycloak image pinned to an approved digest, including the
   versioned Bubllio Keycloakify provider JAR.
3. Versioned, secret-free realm/client configuration and an idempotent apply
   mechanism.
4. Database migration artifacts with documented forward and rollback behavior.
5. A release manifest recording Git SHA, image digests, schema version, and
   configuration version.

The Keycloak image should run `kc.sh build --db=postgres` while building and
`kc.sh start --optimized` at runtime. `start-dev` has insecure defaults and is
strictly local-only.

## UAT setup

UAT must reproduce the Production topology at smaller capacity.

### Required platform inputs

- DNS names such as `auth.uat.bubllio.com` and `core-api.uat.bubllio.com`
- Valid TLS certificates
- Dedicated PostgreSQL database and credentials
- Container registry access by immutable digest
- Secret-manager references for database and bootstrap credentials
- Reverse proxy/load balancer with trusted forwarding headers
- Private access to the Keycloak management port for health and metrics
- Central logs, metrics, alerts, and encrypted backups

### Keycloak runtime contract

Representative settings—not a copy-paste secret file:

```text
KC_DB=postgres
KC_DB_URL=<secret-or-platform-injected-jdbc-url>
KC_DB_USERNAME=<secret-reference>
KC_DB_PASSWORD=<secret-reference>
KC_HOSTNAME=https://auth.uat.bubllio.com
KC_HEALTH_ENABLED=true
KC_METRICS_ENABLED=true
```

When TLS terminates at a trusted reverse proxy, additionally configure the
documented HTTP/proxy-header settings for that proxy and ensure the backend port
is unreachable from the public internet. Do not expose Keycloak's management
port `9000` publicly.

Bootstrap administrator credentials are temporary first-start inputs. Create
named administrator accounts with MFA, verify recovery access, and remove the
bootstrap secret after provisioning.

Do not import `infrastructure/keycloak/realm-bubllio.local.json`: it contains loopback redirect
URIs, a demo user, and disposable assumptions. UAT realm configuration must be
applied through the future reviewed, idempotent provisioning process.

### Core API runtime contract

```text
NODE_ENV=production
PORT=3100
OIDC_ISSUER=https://auth.uat.bubllio.com/realms/bubllio
OIDC_AUDIENCE=bubllio-core-api
```

`OIDC_JWKS_URL` should normally be omitted so it is derived from the issuer. Set
it only when the platform requires an internal route to the same trusted
Keycloak realm, and review that exception explicitly.

### UAT acceptance gate

Before promotion, verify:

- discovery, login, PKCE callback, refresh, and suite logout;
- Core, CRM, and Board SSO using UAT clients and exact redirect URIs;
- valid, expired, wrong-issuer, wrong-audience, and unknown-key tokens;
- two-organization isolation and machine-identity restrictions;
- password reset and email delivery without leaking account existence;
- signing-key rotation, database backup restore, and rollback rehearsal;
- readiness behavior during Keycloak and database restart;
- no demo users, local credentials, wildcard redirect URIs, or public management
  endpoints.

UAT passes only when evidence is recorded in the release manifest or linked test
run.

## Production setup

Production uses the same topology and configuration schema as UAT with separate
accounts, secrets, databases, DNS, and encryption keys.

### Minimum production requirements

- Promote the exact UAT-approved image digests.
- Use `https://auth.bubllio.com` as the stable public issuer; changing an issuer
  is a breaking identity migration.
- Terminate TLS only at a trusted boundary and encrypt every untrusted network
  hop.
- Keep PostgreSQL private, encrypted at rest, and protected by encrypted backups,
  encrypted WAL/transaction logs, restore tests, and retention policy.
- Set explicit CPU/memory requests and limits. Keycloak sizes its JVM heap from
  the container memory limit, so an unset limit is unsafe operationally.
- Route traffic only to instances passing `/health/ready`; monitor `/health/live`
  separately.
- Restrict the administration console and management endpoints by network and
  operator identity. Require MFA for administrators.
- Store secrets in the deployment platform's secret manager, never Git, image
  layers, Compose files, CI logs, or browser configuration.
- Define SLO, RTO, and RPO before selecting single-instance or highly available
  topology. Multiple containers alone do not provide HA without database,
  network, load-balancer, and failover design.

### Deployment sequence

1. Confirm a successful encrypted backup and tested restore procedure.
2. Review the release manifest, migrations, configuration diff, and rollback
   compatibility.
3. Apply backward-compatible database changes.
4. Deploy immutable images by digest with readiness gating.
5. Apply idempotent realm/client changes without replacing runtime secrets.
6. Run discovery, health, login, token-validation, organization-isolation, and
   logout smoke tests.
7. Observe error rate, latency, database health, login failures, and resource use
   through the agreed soak window.
8. Complete the release record or execute rollback.

### Rollback rule

Rollback means redeploying the previous known-good image and configuration
version. Database rollback is permitted only when the migration explicitly
documents it as safe. Never restore an old database snapshot over newer writes
as an ordinary application rollback.

## Configuration ownership

| Value | Source of truth |
| --- | --- |
| Non-secret defaults | Version-controlled deployment configuration |
| Passwords, client secrets, SMTP credentials | Environment secret manager |
| Public issuer and redirect URIs | Environment configuration plus reviewed realm automation |
| Keycloak realm/client structure | Versioned idempotent provisioning |
| User, session, and credential data | Keycloak PostgreSQL database |
| Release image and schema versions | Release manifest |

## Production-readiness blockers

The following must exist before the first UAT deployment:

- production `apps/api` scaffold;
- optimized Keycloak Containerfile with the Bubllio theme;
- UAT/Production orchestration manifests;
- secret-manager integration;
- idempotent realm provisioning without demo identities;
- CI build, scan, signing, registry publication, and promotion workflow;
- database backup/restore automation and operational runbooks;
- environment-specific DNS, TLS, monitoring, and alerting.

## References

- [Keycloak container deployment](https://www.keycloak.org/server/containers)
- [Keycloak production configuration](https://www.keycloak.org/server/configuration-production)
- [Keycloak hostname configuration](https://www.keycloak.org/server/hostname)
- [Keycloak health endpoints](https://www.keycloak.org/observability/health)
- [Keycloak database configuration](https://www.keycloak.org/server/db)
- [Keycloak high-availability overview](https://www.keycloak.org/high-availability/introduction)
