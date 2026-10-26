# Bubllio Core __BUBLLIO_RELEASE_VERSION__

This directory is a self-contained Bubllio Core release bundle. The host needs
Docker Engine with Docker Compose v2, three DNS records pointing to it, and an
existing Docker network shared with an HTTPS reverse proxy.

## Install

1. Verify the archive checksum supplied beside the download.
2. Extract the archive and enter this directory.
3. Create or identify the reverse-proxy Docker network.
4. Prepare the installation:

   ```sh
   ./bubllio prepare \
     --base-domain core.example.com \
     --edge-network proxy
   ```

   This derives `https://core.example.com`, `https://api.core.example.com`, and
   `https://auth.core.example.com`, creates independent credentials, and prints
   the setup secret once. Store that secret immediately.

5. Configure the reverse proxy to route those three hosts to `core-web:8080`,
   `core-api:3100`, and `identity-edge:8080` on the selected network. The
   identity gateway permits public realm and account flows but denies Keycloak
   administration; never route the public hostname directly to `keycloak`.
6. Validate and start:

   ```sh
   ./bubllio doctor
   ./bubllio up
   ```

7. Open `https://core.example.com/setup`. Complete email setup, verify the first
   administrator, and create the first organization in the browser.

Installation state is stored in `./bubllio-state` by default. Override it with
an absolute or relative `BUBLLIO_STATE_DIR` path. Back up this directory and the
three named Docker volumes. Never commit the state directory.

To seed a reviewed suite-application catalog, set
`BUBLLIO_APPLICATIONS_FILE=/absolute/path/applications.json` while running
`prepare`. Omit it for the safe Core-only default.

`./bubllio down` stops the services without deleting data. The helper deliberately
has no data-deletion command.

The included checksum detects accidental corruption; this technical-alpha
bundle is not yet cryptographically signed and does not establish publisher
authenticity by itself.
