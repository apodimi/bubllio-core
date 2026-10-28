# Environment setup and deployment

This guide explains how to obtain and run Bubllio Core locally and defines the
deployment contract for UAT and Production.

> **Current status:** the local foundation and isolated first-run rehearsal are
> runnable. A canonical installation contract, Docker-only release bundle,
> digest-only reference Compose adapter, production images, runtime secret
> adapters, system readiness, and a GHCR release workflow are implemented. The
> first-run UI configures and proves SMTP delivery through a temporary identity
> setup agent before opening registration for the first administrator. Public
> registration closes at the verified setup claim; later users require an
> invitation. This is still an internal technical-alpha delivery slice, not an
> approved external or Production release: a reviewed real SMTP provider,
> privacy and abuse gates, shared rate limits, backup/restore proof, and a clean
> public-host rehearsal remain blocking. Never deploy the
> development Compose file or its demo realm outside a developer machine.

Pull requests and manual checks use the
[Verify Core workflow](../../.github/workflows/verify.yml). A push to `main`
uses one delivery workflow only:
[`release-images.yml`](../../.github/workflows/release-images.yml) verifies the
API, web app, identity theme, browser journeys, portable adapter, and production
bootstrap before it builds multi-architecture images. Main-branch delivery
compares the new source with the last promoted manifest, rebuilds only the
affected images, then smoke-tests the complete digest-pinned image set before
promotion. Tags and forced manual runs always rebuild all images. The manifest's
`commitSha` identifies the source revision that composed and verified the
snapshot; unchanged entries may intentionally retain digests built by an older
revision. The workflow generates SBOMs for rebuilt images and commits the
complete managed Compose snapshot back to `main`. This is continuous alpha
delivery, not Production approval.

Versioned installation releases are created only from reviewed `v*` tags. A
tagged workflow publishes a GitHub prerelease or release whose direct assets are
the bundle, its checksum, a digest-pinned Dokploy Compose adapter, the manifest,
and image SBOMs. A `main` push creates a non-versioned technical-alpha snapshot
only after the full release and production-bootstrap gates pass; it does not
create a GitHub Release or claim a product version. Manual release-workflow runs
remain rehearsal artifacts and do not auto-promote the Git adapter.

Before declaring a stable, UAT, or Production release, the release owner must
disable `ALPHA_MAIN_AUTO_PROMOTION`, remove the `main` release trigger, restore
reviewed tag/manual promotion, and review that policy change. The workflow
blocks stable tags while technical-alpha auto-promotion remains enabled.

Managed panels may consume the released Compose adapter with only a base domain
and a unique setup secret. The first alpha flow and its explicit trust boundary
are documented in [managed-platform installation](managed-platforms.md). It is
an additive adapter to the same contract, not a replacement for the portable
bundle or a general claim that every hosting panel is validated.

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

### Install a published release

Download the release archive and adjacent SHA-256 file, verify the archive, and
extract it. No source checkout or host Node installation is required. The
reference adapter asks for only the base domain and the existing Docker network
shared with the HTTPS reverse proxy:

```bash
sha256sum --check bubllio-core-<version>.tar.gz.sha256
tar -xzf bubllio-core-<version>.tar.gz
cd bubllio-core-<version>
./bubllio prepare \
  --base-domain core.example.com \
  --edge-network proxy
./bubllio doctor
./bubllio up
```

Preparation derives the three public origins, immutable image digests, stable
volume names, health defaults, and an empty Core-only app manifest. It creates
independent private secret files and prints the setup secret once. It never puts
raw secrets in the contract, Compose environment, command arguments, image, or
release archive. `doctor` validates Docker, Compose rendering, generated state,
and the external network without starting a service.

The generated `bubllio-state/` directory and named Docker volumes are durable
installation state. Keep them outside version control, restrict operator
access, and include both in backup and restore procedures. The helper's `down`
command retains data and there is intentionally no destructive reset command.

The archive checksum detects corruption but does not prove publisher identity.
Cryptographic release signing remains required before the bundle can be treated
as an externally trusted production release.

### HTTPS ingress and private service boundary

The reference adapter requires a trusted reverse proxy or load balancer for UAT
and Production. It is the only component that publishes host ports: expose
`80/tcp` only to redirect to HTTPS and `443/tcp` for application traffic. Do not
publish application container ports directly. This provides one controlled
place for certificate issuance and renewal, HTTP-to-HTTPS redirects, forwarding
headers, request limits, and ingress logs without making the hosting platform a
Core product dependency.

Three exact HTTPS origins are required because the browser must reach the
workspace, API, and OIDC provider. “Public” here means routed through the proxy;
it does not mean that protected API operations are unauthenticated.

| Public origin                  | Proxy target         | Purpose                                                                     |
| ------------------------------ | -------------------- | --------------------------------------------------------------------------- |
| `https://dev.bubllio.com`      | `core-web:8080`      | Browser workspace and setup UI                                              |
| `https://api.dev.bubllio.com`  | `core-api:3100`      | Browser and approved application API requests                               |
| `https://auth.dev.bubllio.com` | `identity-edge:8080` | OIDC authorization, tokens, discovery, and account actions; `/admin` denied |

Set `publicEndpoints.webUrl`, `publicEndpoints.apiUrl`, and
`publicEndpoints.identityUrl` in the installation contract to those exact
origins. Path-based alternatives such as `/api` or `/auth` are not supported by
contract version 1. The API still reaches Keycloak privately for JWKS and
administration through `http://keycloak:8080`; public token issuer and redirect
values continue to use `https://auth.dev.bubllio.com`.

Only `core-web`, `core-api`, and `identity-edge` join the proxy's external edge
network. Keycloak shares a dedicated internal network with `identity-edge`, so
Core retains private administration access while the public gateway denies
`/admin` and its child paths. The following remain private, have no public
hostname, and must not publish a host port:

- `core-db` and `identity-db`;
- `core-migrate` and `identity-bootstrap`;
- `identity-setup-agent` and the Keycloak file vault; and
- Keycloak's management and health port `9000`.

Never route the public identity origin directly to Keycloak. The bundled
`identity-edge` policy is the portable enforcement point that denies Keycloak's
administrative console and API while keeping OIDC realm, protocol, account, and
required action routes reachable. Protect the infrastructure proxy dashboard as
an administrative system and do not run Traefik's insecure dashboard mode.

The proxy must replace untrusted forwarding headers and send the reviewed
`X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto` values. Backend
ports must be reachable only from the proxy network, so clients cannot bypass
TLS, routing policy, or ingress controls. A production adapter must also set
Keycloak's proxy trusted addresses to the dedicated proxy subnet or addresses;
the generic reference adapter cannot derive that environment-specific value.
Do not claim accurate Core API client-IP attribution or IP-based application
rate limiting until Fastify proxy trust has been explicitly implemented and
tested.

#### Reverse-proxy adapters

The canonical Compose file intentionally contains no Traefik, Caddy, Nginx,
Dokploy, Coolify, or cloud-specific labels. Configure the platform's routing
layer to map the three exact hosts to `core-web:8080`, `core-api:3100`, and
`identity-edge:8080` on the selected edge network. Do not route public traffic
to `keycloak:8080` and do not add host `ports:` entries.
Disable automatic discovery for every private service and inspect the final
rendered configuration before each ingress change.

A deployment panel may provide a convenient Compose and domain UI, but it is an
adapter—not part of Bubllio's product architecture. Its generated networks must
not attach databases, migration jobs, or setup services to a shared public edge.
Support for any named platform requires that adapter to pass the same
conformance and isolation checks; using the generic bundle does not imply that
the platform is production-certified.

Compose domains also need an explicit HTTP-to-HTTPS redirect. Add HSTS only
after all three origins are proven HTTPS-only; `includeSubDomains` and preload
affect other domain owners and require an explicit human decision. Do not add a
single proxy-level CSP or CORS policy to every service: Core web and Keycloak
have different application-owned requirements.

Before beginning product setup, verify all of the following from outside the
server:

1. all three hostnames resolve to the intended server and present valid,
   renewable certificates;
2. HTTP redirects to the matching HTTPS origin without changing host or path;
3. `/runtime-config.js` contains the exact public API and identity origins;
4. OIDC discovery reports
   `https://auth.dev.bubllio.com/realms/bubllio` as the issuer;
5. login returns to `https://dev.bubllio.com` and API requests have no CORS or
   mixed-content failure;
6. only intended ingress ports are reachable from the internet; and
7. databases, setup-agent, Keycloak management, proxy dashboard, and direct
   application container ports are unreachable externally.

Save the sanitized rendered Compose and proxy output with the UAT evidence. Verify that
the proxy rejects forged forwarding headers and that external access to
`https://auth.dev.bubllio.com/admin/` is denied while OIDC, verification,
registration, and account actions still work. Reverse-proxy and platform access logs
may contain IP addresses and identifiers: define their purpose, access, redaction,
retention, deletion, storage location, and any external processor before real
users. Never log authorization headers, cookies, setup secrets, SMTP
credentials, verification codes, or full sensitive query strings.

The same topology and acceptance checks apply to Traefik, Caddy, Nginx, a cloud
load balancer, or another platform adapter.

The installation contract includes an internal-only identity setup agent image,
a Keycloak vault volume, an agent token, and a distinct temporary Keycloak
bootstrap-client secret. Core can call the agent but cannot mount the vault or
use the bootstrap client. Keycloak mounts the vault read-only; the agent is the
only long-running service with write access. The agent and Keycloak share a
restricted SMTP egress network so the setup test and later identity messages use
the same network policy. Browser registration starts closed and opens only after
the real test email's confirmation code is accepted. It closes again when the
first verified administrator proves the installation secret, before the agent
retires its bootstrap client. See [ADR 0012](../decisions/0012-isolate-email-bootstrap-authority.md).

Do not use this reference adapter for real users yet. The UI-managed technical
path does not select or approve an SMTP processor, configure sender-domain
deliverability, supply shared abuse controls, establish controller/processor
roles, or approve a privacy notice. Member invitation administration and any
wider release remain behind privacy, abuse, recovery, and human approval gates;
ADR 0010's open-registration proposal was withdrawn.

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
- a non-destructive, audited recovery path for a lost or expired one-time setup
  secret;
- database and Keycloak-vault backup/restore automation with recorded restore
  evidence;
- a clean-host rehearsal using exact published digests that proves bootstrap
  retirement, password reset, invitation delivery, restart, and rollback; and
- environment-specific DNS, TLS, resource limits, monitoring, alerting, SLO,
  RTO, and RPO decisions.

## Technical-alpha acceptance and decision owners

The bundle is accepted as an internal technical-alpha delivery artifact when a
clean operator host can verify and extract it, run `prepare`, pass `doctor`,
start the exact digest-pinned release, and reach browser setup without a source
checkout, host Node, Keycloak console work, or manual migrations. Repeating
`prepare` must not rotate or reprint secrets; changing contract-owned inputs in
an existing state directory must fail safely. The rendered deployment must keep
databases and setup services private and expose only the three documented proxy
targets.

Human approval is still required before external alpha:

- the Product Owner owns the release audience and operator journey decision;
- the Release/Operations Owner owns supported-platform claims and clean-host,
  backup, restore, upgrade, and rollback evidence;
- the Security Owner owns release signing, registry trust, secret handling,
  ingress, and threat-model acceptance; and
- the Privacy/Legal Owner owns registration purpose, notices, processors,
  retention, abuse handling, and real-user approval.

Business, design, engineering/security, and privacy review informed these
criteria. That review is not evidence that the named human owners approved an
external release.

## References

- [Traefik Docker provider](https://doc.traefik.io/traefik/providers/docker/)
- [Keycloak reverse-proxy guidance](https://www.keycloak.org/server/reverseproxy)
- [Keycloak container deployment](https://www.keycloak.org/server/containers)
- [Keycloak production configuration](https://www.keycloak.org/server/configuration-production)
- [Keycloak hostname configuration](https://www.keycloak.org/server/hostname)
- [Keycloak health endpoints](https://www.keycloak.org/observability/health)
- [Keycloak database configuration](https://www.keycloak.org/server/db)
- [Keycloak high-availability overview](https://www.keycloak.org/high-availability/introduction)
