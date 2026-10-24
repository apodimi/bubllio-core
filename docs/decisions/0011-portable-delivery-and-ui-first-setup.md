# ADR 0011: Portable delivery with UI-first setup

- Status: Accepted
- Date: 2026-10-24

## Context

Bubllio is self-hosted first and must be straightforward to install on a wide
range of infrastructure. A product tied to one deployment panel would reduce
customer choice, complicate support, and move platform-specific behavior into
the product. A CLI-only installation would expose Keycloak, migrations, and
internal service topology to administrators who should be configuring Bubllio
rather than assembling it.

The product also needs a clear boundary between deploying an application and
granting people access to it. Building a general application installer or
marketplace into Core would add infrastructure orchestration before the suite
has evidence that customers need it.

## Decision

Bubllio defines one canonical, versioned deployment contract. Release artifacts
use immutable container images, explicit persistent storage, public endpoint
configuration, health contracts, and secret inputs. Infrastructure-specific
packages are thin adapters to this contract. Core and its APIs do not contain
Dokploy, Docker Compose, Kubernetes, Coolify, or cloud-provider branches.

Infrastructure bootstrap is deliberately small. An adapter must:

1. start the selected versioned Bubllio services;
2. provide durable storage and private service networking;
3. expose the required HTTPS endpoint or endpoints;
4. inject bootstrap authority without printing secrets into logs; and
5. present the one-time setup secret through an operator-controlled channel.

After Bubllio is reachable, normal first-run configuration belongs in the web
product. The target browser sequence is:

```text
system preflight
  -> email delivery and test
  -> first verified administrator
  -> first organization
  -> final readiness
  -> Core workspace
```

The setup is durable, idempotent, and resumable. A failed dependency is fixed
and retried without rebuilding the installation or creating another
organization. The happy path does not require the Keycloak console, source
changes, or manual database migrations. Advanced infrastructure settings remain
with the adapter and are not exposed as product concepts.

The reviewed deployment manifest determines which Bubllio applications are
installed. Core reconciles their stable keys, names, launch URLs, identity
metadata, and compatible contract versions, then manages organization
availability and member grants. Core does not launch containers, run arbitrary
deployment commands, or provide an application marketplace in the first
release.

## UX requirements

- Use product language such as System check, Email delivery, Administrator
  account, Organization, and Ready. Do not expose realm, JWKS, migration, or
  container terminology on the happy path.
- Give every external dependency a clear status and a bounded test action.
- Use safe defaults and progressive disclosure for advanced configuration.
- Preserve completed work and identify the exact recoverable step after a
  failure.
- Keep secrets out of URLs, browser storage, logs, analytics, and support
  evidence.
- Meet the shared Bubllio visual system, responsive behavior, keyboard access,
  and WCAG AA contrast requirements.

## Alternatives considered

- Make Dokploy the primary product deployment model: rejected because hosting
  choice is not a Bubllio product boundary.
- Require operators to configure every service through environment files and
  the Keycloak console: rejected because it creates avoidable installation and
  support friction.
- Put a general infrastructure orchestrator in Core: rejected because it would
  require broad credentials, provider-specific logic, and a much larger attack
  surface.
- Add application selection and installation to first-run: rejected because the
  deployment manifest already owns what is running. Core owns access after the
  application exists.

## Consequences

- Releases need versioned images, a validated configuration schema, health
  contracts, migration automation, and at least one reference adapter.
- Each additional platform adapter must pass the same installation conformance
  tests rather than redefine setup behavior.
- Secure UI-based email configuration requires an explicit secret-storage and
  Keycloak-provisioning design before production use.
- Product setup can be demonstrated independently of the hosting platform once
  the endpoint and bootstrap authority exist.
- Marketplace, arbitrary deployment execution, and provider fleet management
  remain outside the first release.
