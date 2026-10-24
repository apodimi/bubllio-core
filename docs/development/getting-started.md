# Developer getting started

This guide takes a Bubllio Core developer from a fresh clone to a running local
workspace, an isolated first-run installation rehearsal, and the checks expected
before a pull request. It documents development workflows; it does not approve
the technical-alpha deployment adapter for external or Production use.

## Choose the workflow you need

| Goal                                             | Workflow                                                              | Ports                          | Keeps ordinary local data separate? |
| ------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------ | ----------------------------------- |
| Work on Core, identity, or the workspace UI      | [Daily development stack](#run-the-daily-development-stack)           | `8180`, `3100`, `5174`, `8025` | Not applicable                      |
| Experience what a new installation operator sees | [Isolated first-run rehearsal](#rehearse-a-new-installation)          | `8280`, `3200`, `5274`, `8125` | Yes                                 |
| Validate portable release inputs                 | [Portable adapter validation](#validate-portable-installation-inputs) | Environment-owned              | Yes                                 |

The ordinary development stack imports a disposable demo realm and keeps setup
disabled. It is the fastest feedback loop for feature work and browser tests.
The isolated rehearsal creates a different Compose project with empty volumes
and is the only local workflow that exercises the complete setup UI.

## Understand the repository

Core is the suite control plane, not a proxy for application business APIs.
Keycloak authenticates people and holds identity organizations; Core owns the
suite application catalog, product organizations, entitlements, grants,
installation state, and access decisions.

| Path                       | Responsibility                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apps/api/`                | NestJS API, Prisma model and migrations, setup orchestration, and the isolated identity setup-agent entry point |
| `apps/web/`                | React workspace and setup UI using Material UI and TanStack Query                                               |
| `apps/keycloak-theme/`     | Bubllio login, registration, recovery, and identity email theme                                                 |
| `infrastructure/keycloak/` | Local realm import and Keycloak container assembly                                                              |
| `deploy/`                  | Versioned installation contract, production-oriented images, reference Compose adapter, and conformance checks  |
| `scripts/`                 | Local bootstrap, installation preparation, and development utilities                                            |
| `docs/contracts/`          | Versioned contracts for future suite application consumers                                                      |

Before changing a boundary, read the repository [`AGENTS.md`](../../AGENTS.md),
the [system context](../architecture/system-context.md), and the smallest
relevant architecture or workflow document. If the change also affects CRM,
Board, the public website, or a shared contract, follow the workspace
[cross-project workflow](../../../docs/cross-project-changes.md).

## Prerequisites

Install or make available:

- Git;
- Docker Desktop, or Docker Engine with Docker Compose v2;
- Node.js `24.22.1` and npm for commands that run outside containers;
- `curl` for smoke checks;
- Google Chrome for the Playwright browser suite; and
- Java 21 plus Apache Maven only when building the Keycloak theme JAR directly
  on the host. The Docker image can build the theme without host Java or Maven.

Check the tools before installing anything else:

```bash
node --version
npm --version
docker compose version
docker info
```

The repository declares Node in `.nvmrc` and `.node-version`. `nvm` is optional:
if it is installed, run `nvm use`; if the shell reports `command not found`, use
another Node version manager or an official Node distribution. A missing `nvm`
command does not mean the repository is broken.

## Clone the repository

```bash
git clone https://github.com/apodimi/bubllio-core.git
cd bubllio-core
git status --short --branch
```

GitHub access may be required. Do not create a real `.env` by copying the local
example: `.env.example` contains intentionally disposable values and is passed
to Compose explicitly.

## Run the daily development stack

From the repository root:

```bash
docker compose --env-file .env.example up -d --build
docker compose --env-file .env.example ps
curl --fail http://127.0.0.1:3100/health/live
curl --fail http://127.0.0.1:3100/health/ready
curl --fail http://127.0.0.1:8180/realms/bubllio/.well-known/openid-configuration
```

`/health/live` proves that the API process responds. `/health/ready` also checks
the dependencies required to serve traffic and may return `503` while the stack
is starting. The legacy `/health` route exists only for compatibility; new
checks should use the explicit endpoints.

Start the web client in a second terminal:

```bash
cd apps/web
npm ci
npm run dev
```

The local endpoints are:

| Service                 | Address                        |
| ----------------------- | ------------------------------ |
| Core web                | <http://127.0.0.1:5174>        |
| Core API                | <http://127.0.0.1:3100>        |
| Keycloak                | <http://127.0.0.1:8180>        |
| Keycloak administration | <http://127.0.0.1:8180/admin/> |
| Mailpit inbox           | <http://127.0.0.1:8025>        |

Disposable local credentials are:

```text
Keycloak administrator: admin / local-keycloak-admin-password
Demo user:               spike-user / local-spike-password
```

Never reuse these credentials outside the localhost stack. The Core database is
private inside Compose; the one-shot `core-migrate` service applies committed
migrations before `core-api` starts.

The daily stack is already initialized and deliberately does not show the
first-run wizard. Use the isolated rehearsal below when working on installation
setup. A Keycloak demo organization also does not create a Core product
organization, so a demo user can legitimately reach an empty workspace.

## Work on each component

### Core API

The API follows NestJS module, controller, service, guard, and dependency
injection patterns. Keep controllers transport-focused, put business behavior
in services, validate configuration once at startup, and preserve Core as the
only owner of product access decisions.

The reliable container feedback loop is:

```bash
docker compose --env-file .env.example up -d --build core-api
docker compose --env-file .env.example logs --tail=100 core-api
```

For source checks and unit/integration tests:

```bash
cd apps/api
npm ci
npm run format:check
npm test
npm run build
```

Use `npm run test:watch` during test-driven iteration. `npm run start:dev`
requires a reachable PostgreSQL database and the full runtime configuration;
the default Compose database intentionally has no host port, so rebuilding the
API service is the supported zero-configuration path.

When the Prisma schema changes, commit the generated migration with the schema
and focused tests. Interactive `prisma migrate dev` needs an explicit temporary
database-port override; never publish the database in shared deployment files.

### Core web

```bash
cd apps/web
npm ci
npm run dev
```

Use the shared Bubllio Material UI tokens and TanStack Query for Core server
state. When adding product icons, use Iconify Keyline icons through a small
project-local `AppIcon` wrapper; do not introduce a second component, icon, or
server-state library without an architectural reason. Tokens must stay in
memory; never persist access tokens, refresh tokens, setup secrets, or SMTP
credentials in browser storage.

Before handing off a UI change:

```bash
npm run format:check
npm run build
```

### Keycloak theme and identity email

Compose builds the Keycloakify theme into the local Keycloak image. After a
theme or MJML email-template change, rebuild and recreate only Keycloak:

```bash
docker compose --env-file .env.example build keycloak
docker compose --env-file .env.example up -d --force-recreate keycloak
```

For a host build:

```bash
cd apps/keycloak-theme
npm ci
npm run build:keycloak
```

The host build requires Java 21 and Maven. Request a new message after changing
an email template; messages already captured by Mailpit do not change.

## Rehearse a new installation

The isolated rehearsal answers: “What will an IT administrator see immediately
after cloning and starting Bubllio?” It uses a separate Compose project and does
not modify the daily development volumes.

From a fresh checkout, or after preserving any existing rehearsal state:

```bash
node scripts/bootstrap-local-setup.mjs
```

The script builds the stack, generates private ignored files under `.local/`,
and prints a 30-minute setup secret once. Keep that secret only in the terminal;
do not paste it into chat, a ticket, source control, a screenshot, or a URL.

Open <http://127.0.0.1:5274/>. Before setup is complete, every Core entry route
goes to `/setup`. For the local Email delivery step use:

| Field          | Value                |
| -------------- | -------------------- |
| Sender name    | `Bubllio`            |
| Sender email   | `hello@example.test` |
| SMTP host      | `mailpit`            |
| SMTP port      | `1025`               |
| Security       | No encryption        |
| Authentication | Off                  |
| Test recipient | `owner@example.test` |

Read the confirmation code at <http://127.0.0.1:8125>, then continue through
administrator account creation, email verification, installation claim, first
organization creation, invitation acceptance, retry, and fresh workspace sign
in. The exact sequence and expected states are in the
[first-run installation runbook](../operations/first-run.md#first-manual-test-from-a-fresh-checkout).

If startup fails after `.local/setup-rehearsal.env` is created, fix the port or
Docker problem and resume the same installation:

```bash
node scripts/bootstrap-local-setup.mjs --resume
```

Do not start a second bootstrap over an unfinished rehearsal. The isolated
ports are Core web `5274`, API `3200`, Keycloak `8280`, and Mailpit `8125`.

Verify the completed installation:

```bash
curl --fail http://127.0.0.1:3200/health/live
curl --fail http://127.0.0.1:3200/health/ready
curl --fail http://127.0.0.1:3200/api/v1/system/preflight
curl --fail http://127.0.0.1:3200/api/v1/setup/status
```

The setup status must report `"setupRequired":false` and `"phase":"ready"`.
This proves the local product ceremony, not external-production readiness.

## Run the verification gates

Run the smallest affected check while iterating and every relevant gate before
handoff.

```bash
cd apps/api
npm ci
npm run format:check
npm test
npm run build
npm audit --omit=dev

cd ../web
npm ci
npm run format:check
npm run build
npm audit --omit=dev

cd ../keycloak-theme
npm ci
npm run build:keycloak
npm audit --omit=dev
```

With the ordinary development stack healthy, run the browser suite:

```bash
cd apps/web
npm run test:e2e
```

The suite requires Google Chrome and the ordinary ports `8180`, `3100`, and
`5174`; the isolated first-run stack is not its fixture. CI runs code checks on
pushes and pull requests. Browser checks run on pull requests and manual
workflow runs before release.

## Validate portable installation inputs

The portable Compose adapter is a technical-alpha reference for infrastructure
integration. It is not the daily development stack and must not be exposed to
real users yet.

Start with the [deployment guide](../deployment/README.md) and a verified release
manifest. Copy the example contract outside the repository, replace its fake
digests and domains, and keep the prepared output outside version control:

```bash
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

Do not use the example image digests, mutable tags, localhost origins, or local
credentials for UAT or Production. Promotion still requires the documented SMTP,
privacy, abuse, rate-limit, backup/restore, observability, HTTPS, and clean-host
evidence gates.

## Troubleshooting

| Symptom                                  | Resolution                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `nvm: command not found`                 | `nvm` is optional. Confirm `node --version`; install Node `24.22.1` with your preferred manager if necessary.                     |
| `docker info` fails                      | Start Docker Desktop or the Docker daemon, then rerun the command.                                                                |
| A port is already allocated              | Stop the process using the affected daily or isolated port. Use `--resume` if the rehearsal already generated its local state.    |
| `/health/ready` returns `503`            | Run `docker compose ... ps` and inspect `core-api`, `core-db`, `keycloak`, and migration health. Liveness alone is not readiness. |
| The setup page never appears             | The daily stack has setup disabled. Use `bootstrap-local-setup.mjs` and port `5274`.                                              |
| A setup email is missing                 | Check isolated Mailpit on `8125`; use host `mailpit`, port `1025`, no encryption, and no authentication.                          |
| An ordinary development email is missing | Check Mailpit on `8025` and confirm the local Keycloak service is healthy.                                                        |
| Theme changes do not appear              | Rebuild and force-recreate `keycloak`; existing realm volumes are not re-imported on restart.                                     |
| Browser tests cannot connect             | Start the ordinary stack and the web dev server on `5174`; the isolated rehearsal uses different ports.                           |
| The workspace has no apps                | This can be correct: deployment availability, organization enablement, and member grants are separate conditions.                 |

## Stop, reset, and protect local data

Stop the daily stack while retaining its volumes:

```bash
docker compose --env-file .env.example down
```

The following command permanently deletes the ordinary stack's disposable
local users, organizations, email state, and Core data. Run it only when that is
the intended reset, never against UAT or Production storage:

```bash
docker compose --env-file .env.example down --volumes
```

Use the reset command in the [first-run runbook](../operations/first-run.md#troubleshooting)
for the isolated rehearsal; its project and volumes are intentionally separate.

Never commit `.local/`, real environment files, secrets, databases,
`node_modules/`, build output, browser traces, screenshots containing action
links, or contributor-specific IDE state. Before opening a pull request, review
`git status`, update affected documentation and tests, and state any skipped
gate and remaining cross-project or release risk.
