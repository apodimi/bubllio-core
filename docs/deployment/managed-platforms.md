# Managed-platform installation

This guide answers one question: how does an operator start a released Bubllio
Core adapter from a Compose hosting panel without using SSH or generating host
files?

The Compose distribution is independent of the hosting platform. Dokploy is
the current test environment. Other panels supply the same inputs and must pass
the same conformance checks before they are described as validated.

## Inputs

Connect the GitHub repository in your hosting panel and select
`./deploy/managed/compose.yaml`. The checked-in file pins the published
`0.1.0-alpha.3` images by digest, recorded in the adjacent
`release-manifest.json`. It is ready to deploy; the `.template.yaml` file is
only for release tooling. Add these service-level values:

```dotenv
BUBLLIO_BASE_DOMAIN=dev.bubllio.com
BUBLLIO_SETUP_SECRET=<43-character base64url secret>
BUBLLIO_EDGE_NETWORK=<existing-reverse-proxy-network>
```

Generate the setup secret as 32 random bytes using a password manager or the
[OpenSSL commands in the README](../../README.md#install-a-published-technical-alpha-release),
including macOS clipboard and ready-to-paste environment variants. It must be
exactly 43 base64url characters (`A-Z`, `a-z`, `0-9`, `_`, `-`), must be unique
to this installation, and must not be a human passphrase. Store it until browser
setup is complete. Do not place it in project-wide variables, screenshots,
support bundles, chat, tickets, or source control.

The first deployment fails safely when the secret is absent or malformed. The
initializer receives it without network access, prints no secret, stores only a
SHA-256 digest and expiry, and creates independent internal credentials in
service-scoped named volumes. Repeating deployment preserves all credentials.

`BUBLLIO_EDGE_NETWORK` names the existing Docker network shared with your HTTPS
reverse proxy. Use your infrastructure's value: for example `dokploy-network`
in a standard Dokploy installation. There is no hosting-vendor default. DNS,
TLS, and the proxy network are infrastructure inputs; browser setup and internal
credential generation use the same behavior on every adapter.

## Dokploy flow

1. Create a **Compose** service, choose **Docker Compose** (not Stack), and
   select **GitHub** as the source.
2. Select repository `apodimi/bubllio-core`, branch `main`, and Compose Path
   `./deploy/managed/compose.yaml`. Save with automatic deployment disabled for
   this first setup test. No download or YAML copy is required. The Compose file
   selects the reviewed release images even when application source changes on
   `main`; promoting its digests is an explicit release change.
3. Add the three service-level environment values above, setting
   `BUBLLIO_EDGE_NETWORK=dokploy-network` for a standard Dokploy installation.
4. Keep isolated deployment off; the adapter uses Dokploy's existing
   `dokploy-network` only for the three public services.
5. Add these HTTPS domains in Dokploy:

   | Domain                                     | Service    | Port |
   | ------------------------------------------ | ---------- | ---: |
   | base domain, for example `dev.bubllio.com` | `core-web` | 8080 |
   | `api.` plus the base domain                | `core-api` | 3100 |
   | `auth.` plus the base domain               | `keycloak` | 8080 |

6. Preview the rendered Compose. Confirm that there are no host `ports`, and
   only `core-web`, `core-api`, and `keycloak` join `dokploy-network`.
7. Deploy, wait for the three public services to become healthy, then open
   `https://<base-domain>/setup` and complete the browser flow.
8. After the installation is claimed, delete `BUBLLIO_SETUP_SECRET` from the
   Dokploy service and redeploy. The initializer must report that state is ready
   without rotating it. Confirm the replacement initializer container no longer
   contains the raw value.

Dokploy administrators and anyone with equivalent Docker/configuration access
may inspect the raw setup value during bootstrap. That is an explicit
technical-alpha trust assumption. Deleting the current value may not erase
historical platform records or backups, so never reuse it.

## Recovery and limitations

If an earlier checkout failed realm import with
`The /opt/keycloak/vault directory doesn't exist`, deploy the latest `main`
using the same environment and volumes. Bootstrap waits for vault initialization
and mounts the vault read-only; no reset or credential rotation is needed.

If realm import reports `bubllio-realm.json (Permission denied)`, use the
corrected Keycloak release and its promoted Compose snapshot. The `alpha.2`
image created a non-traversable import directory. The fixed image retains the
non-root importer and read-only realm file; no runtime permission workaround,
root user, extra capability, or data reset is required.

- A changed base domain or setup secret is rejected after initialization.
- An expired or lost setup secret has no non-destructive rotation flow yet.
- Removing named volumes is destructive and is not a recovery procedure.
- This adapter is not approved for real users, UAT, or Production until its
  clean-host rehearsal and the release gates in the main deployment guide pass.

## Promote a new release into the Git deployment path

Release maintainers update `deploy/managed/release-manifest.json` from the
published release and regenerate `deploy/managed/compose.yaml` with
`scripts/build-managed-adapter.mjs`. Review and commit both files together.
The delivery CI gate regenerates the snapshot and rejects drift between the
manifest, template, and deployable Compose file. Operators keep the same path
and environment inputs when a reviewed release is promoted.
