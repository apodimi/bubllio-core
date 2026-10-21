# ADR 0006: Use Keycloakify for the identity theme

- Status: Accepted
- Date: 2026-10-22

## Context

The suite needs one branded identity experience across login, password reset,
MFA, account recovery, and future Keycloak flows. A native FreeMarker theme made
small login changes fast, but tied the UI to generated Keycloak markup and made
consistent component behavior harder to maintain.

The product teams already work in React and TypeScript. The identity UI must
remain owned by Keycloak: Core must never receive passwords, recovery codes, or
MFA secrets.

## Decision

Build the `bubllio` login theme with Keycloakify in the standalone
`apps/keycloak-theme` package. It uses React and TypeScript, Bubllio design
tokens and assets, and the workspace-standard Iconify Keyline icons.

The build produces a Keycloak provider JAR. The Bubllio Keycloak container
copies that JAR into `/opt/keycloak/providers` and runs `kc.sh build`; UAT and
Production promote that immutable image rather than mounting theme source.

Keycloak continues to own every credential form submission and security flow.
The React theme changes presentation only; it is not an application-hosted
login form and does not proxy credentials through Core.

## Consequences

- Identity screens can share typed React components and localization behavior.
- The theme can be previewed independently and remains isolated from the Core
  browser client.
- Keycloak upgrades must include a theme build and login/reset/MFA regression
  check against the target Keycloak version.
- Node is now part of the Keycloak image build, but not its runtime image.
- A native FreeMarker fallback is not maintained in parallel.
