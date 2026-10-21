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

| Question | Document |
| --- | --- |
| What product are we building? | [`PRODUCT.md`](PRODUCT.md) |
| How is the suite divided? | [`docs/architecture/system-context.md`](docs/architecture/system-context.md) |
| Who owns identity and organizations? | [`docs/architecture/identity-and-organizations.md`](docs/architecture/identity-and-organizations.md) |
| How will applications communicate? | [`docs/architecture/cross-app-contracts.md`](docs/architecture/cross-app-contracts.md) |
| What must the first experiment prove? | [`docs/spikes/keycloak-sso.md`](docs/spikes/keycloak-sso.md) |
| Which decisions are proposed? | [`docs/decisions/README.md`](docs/decisions/README.md) |
| How do environments run safely? | [`docs/deployment/README.md`](docs/deployment/README.md) |
| How may the software be used? | [`LICENSE`](LICENSE) and [`COMMERCIAL-LICENSE.md`](COMMERCIAL-LICENSE.md) |

Workspace-wide guidance lives in [`../AGENTS.md`](../AGENTS.md). This
repository's [`AGENTS.md`](AGENTS.md) owns Core-specific rules.

## Run the local foundation

The environment is isolated to localhost and uses disposable credentials from
`.env.example`.

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

Run the API checks independently with:

```bash
cd apps/api
npm ci
npm run format:check
npm test
npm run build
```

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

