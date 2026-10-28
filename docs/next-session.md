# Next session

Last updated: 2026-10-29. This is a short handoff, not a release approval.

## Start here

1. Read the [suite architecture](architecture/suite-architecture.md) for the
   current Core/CRM split and the target integration.
2. Before any new browser setup on the dev host, compare Dokploy's running
   volumes and image digests with the intended installation. On 2026-10-28 the
   public `setup/status` response changed from `ready` to `new`, while email
   delivery still reported `ready`. The cause was not established. Do not
   clear volumes, create another owner, or assume a source push fixed that
   durable-state mismatch.
3. Confirm whether the deployed Keycloak realm belongs to an older completed
   installation or a new first run. Older completed realms need an explicit
   **User registration: Off** reconciliation; new installations running the
   current claim flow close public registration automatically when the
   verified first administrator proves the setup secret.

## Current implementation

- Core has a Keycloak-backed first-run flow, durable first-organization
  operation, workspace app catalog, explicit member grants, and a versioned
  access-decision API. Its current UI does not yet administer member
  invitations or grants. CRM still uses its own Django identity, membership,
  invitations, and SimpleJWT.
- The first-run email test sends a bilingual HTML and plain-text code message.
  The isolated identity setup agent holds temporary realm authority; the Core
  runtime does not gain `manage-realm`.
- The technical-alpha GitHub workflow promotes digest-pinned API, web, identity,
  installer, and setup-agent images into `deploy/managed/`. A promoted manifest
  is not proof of a Dokploy rollout. The current manifest is the version source
  for a managed deployment.
- The Core repository has focused project skills under `.agents/skills/` for
  first-run diagnosis, onboarding UX, and release verification.

## Work still open

- Reconcile the dev host's Core/Keycloak durable state and verify the live
  registration setting without resetting data.
- Build owner/admin member invitation and grant-management UI, with tests for
  denied direct API access and the Keycloak invitation journey.
- Add a standard backend access adapter and migrate CRM additively, preserving
  the shipped Django auth path until its compatibility and rollback gates pass.
- Complete external release requirements: SMTP provider and deliverability,
  privacy/legal decisions, abuse controls, backup/restore, monitoring, and
  clean-host deployment evidence. Technical-alpha success is not Production
  approval.

## Verification entry points

- Run the mandatory checks in `AGENTS.md` and the relevant package workflow.
- Use [first-run operations](operations/first-run.md) for installation and
  recovery, and [deployment](deployment/README.md) for release evidence.
- Compare the running host with `deploy/managed/release-manifest.json` and
  `deploy/managed/compose.yaml` before saying a change is live.
