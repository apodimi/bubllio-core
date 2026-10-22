# Bubllio Core

Bubllio Core is the control plane for the Bubllio suite. It coordinates suite
identity, organizations, application availability, entitlements, installations,
and cross-application contracts without owning the business data of individual
applications.

The repository is in foundation development. Keycloak and NestJS have been
selected for identity and the Core API; production readiness remains gated by
the evidence and deployment checks documented below.

## Current outcome

Prove one vertical slice before building the platform:

1. A user signs in through the suite identity provider.
2. The user opens Core, CRM, and Board without signing in again.
3. The user creates a Board task linked to a CRM company in the same
   organization.
4. Cross-organization access is rejected.
5. Suite logout terminates the shared session.

## Start here

| Question                              | Document                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| What product are we building?         | [`PRODUCT.md`](PRODUCT.md)                                                                           |
| How is the suite divided?             | [`docs/architecture/system-context.md`](docs/architecture/system-context.md)                         |
| Who owns identity and organizations?  | [`docs/architecture/identity-and-organizations.md`](docs/architecture/identity-and-organizations.md) |
| How will applications communicate?    | [`docs/architecture/cross-app-contracts.md`](docs/architecture/cross-app-contracts.md)               |
| What must the first experiment prove? | [`docs/spikes/keycloak-sso.md`](docs/spikes/keycloak-sso.md)                                         |
| Which decisions are proposed?         | [`docs/decisions/README.md`](docs/decisions/README.md)                                               |
| How do environments run safely?       | [`docs/deployment/README.md`](docs/deployment/README.md)                                             |
| How may the software be used?         | [`LICENSE`](LICENSE) and [`COMMERCIAL-LICENSE.md`](COMMERCIAL-LICENSE.md)                            |

Workspace-wide guidance lives in [`../AGENTS.md`](../AGENTS.md). This
repository's [`AGENTS.md`](AGENTS.md) owns Core-specific rules.

## Run the local foundation

The environment is isolated to localhost and uses disposable credentials from
`.env.example`.

Use Node.js 24.22.1 LTS for every JavaScript workspace. With nvm, run
`nvm use` from the repository root; compatible IDEs can read `.node-version`.

```bash
docker compose --env-file .env.example up -d --build
docker compose --env-file .env.example ps
curl --fail http://127.0.0.1:3100/health
curl --fail http://127.0.0.1:8180/realms/bubllio/.well-known/openid-configuration
```

- Keycloak: <http://127.0.0.1:8180>
- Administration console: <http://127.0.0.1:8180/admin/>
- Local administrator: `admin` / `local-keycloak-admin-password`
- Disposable user: `spike-user` / `local-spike-password`
- Local email inbox: <http://127.0.0.1:8025>
- Core PostgreSQL stays private inside Compose; `core-migrate` applies committed
  migrations before the API starts.
- Core API health: <http://127.0.0.1:3100/health>
- Core web client: <http://127.0.0.1:5174>

Run the browser client in a second terminal:

```bash
cd apps/web
npm ci
npm run dev
```

The login, reset, and MFA screens come from the React/TypeScript Keycloakify
theme in `apps/keycloak-theme`. Compose builds it into the local Keycloak image,
so theme changes require rebuilding and recreating that service:

```bash
docker compose --env-file .env.example build keycloak
docker compose --env-file .env.example up -d --force-recreate keycloak
```

Open <http://127.0.0.1:5174>. Anonymous visitors are redirected directly to the
Bubllio-branded Keycloak login; an existing suite session returns without a
second login. Sign in with the disposable user and call the protected `/me`
endpoint. The user must belong to a Keycloak organization so the access token
carries the tenant context required by Core.

The realm import selects the Bubllio login theme on a fresh local database. If
the realm already existed before the theme was added, select `bubllio` under
`Realm settings → Themes → Login theme`, or reset the disposable local database
using the command below.

### Inspect local emails

Keycloak sends local password-reset and verification messages to Mailpit. Open
<http://127.0.0.1:8025> to inspect them; no message is delivered to a real mail
provider. To verify the complete reset flow, select **Forgot Password** on the
Bubllio login screen, submit `spike-user`, open the new message in Mailpit, and
follow its reset link.

Captured messages and their action links are local secrets. Do not share them
in screenshots, logs, or test artifacts. The inbox is intentionally disposable:
it is not backed by a Docker volume and is cleared when the Mailpit container is
recreated. Override only the host UI port with `MAILPIT_UI_PORT`; SMTP remains
available exclusively to Compose services at `mailpit:1025`.

Keycloak applies realm imports only when the realm is first created. Developers
with an older disposable local database can either configure `Realm settings →
Email` manually or run `docker compose --env-file .env.example down --volumes`
once before starting the stack again. The latter removes all local Keycloak
users and organizations.

Identity emails are authored as MJML in
`apps/keycloak-theme/src/email/templates`. The Keycloak image compiles them to
responsive HTML and plain-text FreeMarker templates during its normal build.
After changing a template, rebuild and recreate the `keycloak` service, then
request a fresh email; messages already stored in Mailpit do not change.

### Core persistence

Core owns a separate PostgreSQL database for product organizations, suite roles,
provisioning progress, and security audit events. It never reads the Keycloak,
CRM, or Board databases. Local startup waits for the database and applies
committed migrations through the one-shot `core-migrate` service.

To create a development migration after editing
`apps/api/prisma/schema.prisma`, run from `apps/api`:

```bash
DATABASE_URL=postgresql://bubllio_core:local-core-db-password@127.0.0.1:5432/bubllio_core \
  npm run db:migrate -- --name describe_the_change
```

The database port is intentionally not published by the default Compose file.
Use an explicit temporary override when interactive migration development is
needed; do not publish it in shared production configuration.

Run the API checks independently with:

```bash
cd apps/api
npm ci
npm run format:check
npm test
npm run build
```

Run the browser identity journeys while the local stack is running. The suite
uses the installed Google Chrome and prepares its disposable Keycloak
organization fixture idempotently:

```bash
cd apps/web
npm ci
npm run test:e2e
```

The browser suite covers the two-step sign-in, protected `/me` organization
context, suite logout, password reset, English/Greek switching, and the narrow
mobile layout.

Stop the environment while retaining its database:

```bash
docker compose --env-file .env.example down
```

To reset all disposable local identity data, run
`docker compose --env-file .env.example down --volumes`, then start it again.

## License

Bubllio Core is source-available under the
[Elastic License 2.0](LICENSE). Self-hosting, modification, redistribution, and
paid installation or support are permitted subject to the license. Providing a
substantial set of Bubllio functionality as a third-party hosted or managed
service requires a separate [commercial agreement](COMMERCIAL-LICENSE.md).

The Bubllio name and brand assets are governed separately by the
[trademark policy](TRADEMARKS.md). Bubllio Core is source-available and must not
be described as OSI-approved open source.
