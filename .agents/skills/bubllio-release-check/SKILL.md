---
name: bubllio-release-check
description: Trace a Bubllio Core change from source commit through GitHub images and release manifest to the actual dev deployment when someone asks whether it is live or still sees old UI.
---

# Bubllio release check

Use this when a Core change was pushed, a build ran, or Dokploy reports a
deployment but the browser still shows old behavior. Read `AGENTS.md`,
`docs/deployment/README.md`, the current release workflow, and the managed
manifest/Compose adapter relevant to that environment.

## Trace the deployed version

1. Identify the source commit and its GitHub workflow run. Confirm the required
   checks, image publishing, and manifest promotion actually succeeded.
2. Compare the manifest's image digests with the managed Compose file and the
   deployment's selected source revision. A green source build alone does not
   prove the server pulled the new images.
3. Verify the live surface independently: inspect the public Core HTML asset
   hashes, runtime config, coarse setup status, API health, and the exact
   failing endpoint. Use private logs or deployment metadata only when needed.
4. Tell the user which boundary is current and which is stale. Give the next
   smallest action, such as redeploying the promoted manifest or refreshing an
   old browser asset, and verify again afterward.

Do not suggest deleting volumes to fix stale UI or an auth mismatch. Volumes
contain durable Core and Keycloak state. Do not claim a GitHub promotion is a
successful Dokploy rollout. Preserve separate Core, Keycloak, and browser
evidence, especially when a deployment is staggered.

Before marking a release live, verify the specific user-visible behavior and
its API contract on the running environment. Report anything that still needs
an operator action, such as a one-time Keycloak realm setting on an already
initialized installation.
