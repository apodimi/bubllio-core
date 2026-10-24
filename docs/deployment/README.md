# Environment setup and deployment

This guide explains how to obtain and run Bubllio Core locally and defines the
deployment contract for UAT and Production.

> **Current status:** the local foundation and isolated first-run rehearsal are
> runnable. A canonical installation contract, digest-only reference Compose
> adapter, production images, runtime secret adapters, system readiness, and a
> GHCR release workflow are implemented. The first-run UI now configures and
> proves SMTP delivery through a temporary identity setup agent before opening
> registration. This is still an internal technical-alpha delivery slice, not
> an approved external or Production release: a reviewed real SMTP provider,
> privacy/registration and abuse gates, shared rate limits, backup/restore
> proof, and a clean public-host rehearsal remain blocking. Never deploy the
> development Compose file or its demo realm outside a developer machine.

The [Verify Core workflow](../../.github/workflows/verify.yml) runs production
dependency audits, API tests and build, web format/build, the Keycloak theme
build checks on pushes and pull requests. Browser identity tests run on pull
requests and manual workflow runs before a release. It does not
publish an image, provision a realm, or approve a deployment. Those release
artifacts remain part of the UAT and Production gate below. The
[`release-images.yml`](../../.github/workflows/release-images.yml) workflow
builds multi-architecture images, records immutable digests, generates SBOMs,
and publishes a release manifest after the same verification succeeds.

## Portable delivery contract

[ADR 0011](../decisions/0011-portable-delivery-and-ui-first-setup.md) defines
the accepted direction. Its first portable delivery slice is implemented under
`deploy/`, while the existing root Compose file remains the local-development
environment.
Bubllio will publish one canonical versioned contract for images, configuration,
storage, endpoints, health, migrations, and bootstrap outputs. Platform packages
such as Compose, Helm, Dokploy, Coolify, and cloud marketplace templates adapt
that contract without changing Core product behavior.

An adapter starts the release, supplies durable storage and HTTPS routing, and
hands the operator the one-time setup secret. Once the endpoint is reachable,
the product UI owns system preflight, email delivery, first administrator, first
organization, and readiness. The deployment manifest determines which apps are
present; Core does not install their containers.

For a first installation exercise from an empty checkout, follow the
[isolated manual test](../operations/first-run.md#first-manual-test-from-a-fresh-checkout).
It uses a separate Compose project and does not reset existing developer data.

### Reference adapter rehearsal

The canonical operator input is
[`deploy/contract/bubllio-installation.schema.json`](../../deploy/contract/bubllio-installation.schema.json).
The example contains intentionally fake image digests and domains; replace them
with the digest values from a verified release manifest and real HTTPS origins.
Keep the resulting contract and generated output outside version control.

```bash
cp deploy/contract/bubllio-installation.example.json /secure/path/installation.json
# Edit the private copy with release digests, origins, volumes, and app manifest.
node scripts/prepare-installation.mjs \
  --contract /secure/path/installation.json \
  --output-dir /secure/path/prepared
node deploy/adapter-conformance/verify.mjs \
  --contract /secure/path/installation.json \
  --env-file /secure/path/prepared/compose.env \
  --validate-only
docker compose --env-file /secure/path/prepared/compose.env \
  -f deploy/compose/compose.yaml config
```

Preparation creates private secret files, an exact application manifest, and a
Compose environment file, then prints the raw setup secret once. It never puts
the raw secret in the contract, generated environment, or image. The operator
must create the named external edge network and translate the adapter labels for
their reverse proxy before starting the stack.

The installation contract includes an internal-only identity setup agent image,
a Keycloak vault volume, an agent token, and a distinct temporary Keycloak
bootstrap-client secret. Core can call the agent but cannot mount the vault or
use the bootstrap client. Keycloak mounts the vault read-only; the agent is the
only long-running service with write access. The agent and Keycloak share a
restricted SMTP egress network so the setup test and later identity messages use
the same network policy. Browser registration starts closed and opens only after
the real test email's confirmation code is accepted and the agent proves that
its bootstrap client can no longer obtain a token. See [ADR 0012](../decisions/0012-isolate-email-bootstrap-authority.md).

Do not use this reference adapter for real users yet. The UI-managed technical
path does not select or approve an SMTP processor, configure sender-domain
deliverability, supply shared abuse controls, establish controller/processor
roles, or approve a privacy notice. Open browser registration therefore remains
behind the privacy, abuse, recovery, and human approval gates in ADR 0010.

## Environment model

| Concern       | Local                                  | UAT                                 | Production                           |
| ------------- | -------------------------------------- | ----------------------------------- | ------------------------------------ |
| Purpose       | Development and disposable experiments | Production-like validation          | Customer traffic                     |
| Keycloak mode | `start-dev`                            | `start --optimized`                 | `start --optimized`                  |
| Database      | Local PostgreSQL container             | Dedicated PostgreSQL                | Managed/operated HA PostgreSQL       |
| TLS           | Not required on loopback               | Required                            | Required                             |
| Secrets       | Disposable `.env.example` values       | Secret manager                      | Secret manager with rotation         |
| Realm data    | Demo import allowed                    | Automated environment configuration | Reviewed automated configuration     |
| Images        | Local build                            | Immutable registry digest           | Same tested digest promoted from UAT |
| Availability  | Best effort                            | Production-like                     | Defined from agreed SLO/RTO/RPO      |

## Obtain the repository

```bash
git clone https://github.com/apodimi/bubllio-core.git
cd bubllio-core
```

GitHub access may be required. The release tag or commit SHA must still be
chosen explicitly for UAT and Production.

Use the supported release tag or commit SHA for UAT and Production. Never deploy
directly from an unreviewed working tree or a mutable branch reference.

## Local environment

### Prerequisites

- Docker Desktop or Docker Engine with Compose v2
- Node.js 24.22.1 LTS and npm when running checks outside Docker. The root
  `.nvmrc` and `.node-version` keep terminals and IDEs on the same release.
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
curl --fail http://127.0.0.1:3100/health/live
curl --fail http://127.0.0.1:3100/health/ready
```

Local endpoints:

| Service                 | URL                                  |
| ----------------------- | ------------------------------------ |
| Keycloak                | <http://127.0.0.1:8180>              |
| Keycloak administration | <http://127.0.0.1:8180/admin/>       |
| Core API liveness       | <http://127.0.0.1:3100/health/live>  |
| Core API readiness      | <http://127.0.0.1:3100/health/ready> |
| Core web client         | <http://127.0.0.1:5174>              |

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

Implemented release artifacts:

1. Separate non-root Core API and migration images from
   `apps/api/Dockerfile.production`.
2. A non-root static Core web image whose public endpoints are injected through
   `/runtime-config.js` when the container starts.
3. A non-root, internal-only identity setup agent image built from the API
   package but started through its own Nest entrypoint.
4. An optimized Keycloak image pinned by digest, containing the versioned
   Bubllio Keycloakify provider JAR.
5. Versioned secret-free realm/client and application-manifest inputs, plus a
   Keycloak file-vault volume that only the setup agent can write.
6. A release manifest recording the Git SHA and immutable image digests, plus
   per-image provenance and SBOM output.

Still required before promotion: a reviewed real SMTP provider and
sender-domain/deliverability evidence, live least-privilege identity-bootstrap
retirement evidence, migration rollback and backup/restore rehearsal,
privacy/registration approval, shared rate limiting, monitoring, and a
clean-host UAT run using the exact published digests.

The email migration supports either a fresh `NOT_STARTED` installation or a
previously terminal `READY` pre-alpha installation. It deliberately aborts when
an older installation is mid-claim or mid-provisioning; finish or reset that
restricted rehearsal before upgrading. A grandfathered `READY` marker preserves
upgrade continuity but is not evidence that SMTP was retested under this flow.

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
- Core and CRM SSO using UAT clients and exact redirect URIs; Board joins when
  its application exists;
- Core app grants for two members in one organization, including an allowed CRM
  member and a denied member using a direct CRM API URL;
- a second conformance app key proving independent grants without requiring a
  production Board deployment;
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

| Value                                               | Source of truth                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| Non-secret defaults                                 | Version-controlled deployment configuration                              |
| Database, runtime, bootstrap, and agent credentials | Environment secret manager                                               |
| UI-supplied authenticated SMTP password             | Keycloak file-vault volume written only by the temporary setup authority |
| Public issuer and redirect URIs                     | Environment configuration plus reviewed realm automation                 |
| Keycloak realm/client structure                     | Versioned idempotent provisioning                                        |
| User, session, and credential data                  | Keycloak PostgreSQL database                                             |
| Release image and schema versions                   | Release manifest                                                         |

## Production-readiness blockers

The following still blocks promotion beyond restricted technical UAT:

- a reviewed SMTP provider, DPA/subprocessor and transfer decision, approved
  sender domain, and bounce/complaint recovery;
- shared setup and registration abuse controls suitable for horizontal scale;
- an approved privacy notice, controller/processor allocation, retention,
  DSAR, deletion, offboarding, and incident procedures;
- CI vulnerability scanning/signing policy and registry promotion approval;
- database and Keycloak-vault backup/restore automation with recorded restore
  evidence;
- a clean-host rehearsal using exact published digests that proves bootstrap
  retirement, password reset, invitation delivery, restart, and rollback; and
- environment-specific DNS, TLS, resource limits, monitoring, alerting, SLO,
  RTO, and RPO decisions.

## References

- [Keycloak container deployment](https://www.keycloak.org/server/containers)
- [Keycloak production configuration](https://www.keycloak.org/server/configuration-production)
- [Keycloak hostname configuration](https://www.keycloak.org/server/hostname)
- [Keycloak health endpoints](https://www.keycloak.org/observability/health)
- [Keycloak database configuration](https://www.keycloak.org/server/db)
- [Keycloak high-availability overview](https://www.keycloak.org/high-availability/introduction)
