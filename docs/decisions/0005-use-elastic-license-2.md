# ADR 0005: Use the Elastic License 2.0

- Status: Accepted
- Date: 2026-10-21

## Context

Bubllio should remain inspectable, modifiable, redistributable, and available for
self-hosting. Third parties should be free to charge for installation,
configuration, training, and support around customer-controlled deployments.

Bubllio intends to reserve the right to offer the product itself as a hosted or
managed service. The AGPL requires hosted modifications to remain available as
source, but does not prohibit a third party from operating a competing hosted
service. Permissive licenses provide even less protection for this model.

## Decision

License Bubllio Core under the Elastic License 2.0 (`ELv2`). Describe the project
as source-available, not OSI-approved open source.

Offer separately negotiated commercial licenses when a third party requires
hosted/managed-service rights or another exception to ELv2. Keep Bubllio names
and brand assets outside the software license under a separate trademark policy.

## Consequences

- Users may inspect, use, modify, redistribute, and self-host the software under
  ELv2.
- Consultants may sell setup and support without receiving hosted-service rights.
- Third parties may not expose a substantial set of Bubllio functionality as
  their own hosted or managed service under ELv2.
- Bubllio can authorize hosting partners through separate commercial agreements.
- The project must not market itself as OSI-approved open source.
- Some organizations and contributors may reject source-available licenses,
  reducing adoption relative to Apache 2.0 or another permissive license.
- Contributor terms must preserve the project's ability to enforce ELv2 and
  grant commercial licenses; a reviewed contribution agreement is required
  before accepting substantial external contributions.
- The licensing package requires review by qualified software-licensing counsel
  before public release.

## References

- [Elastic License 2.0](https://www.elastic.co/licensing/elastic-license/)
- [Elastic License 2.0 FAQ](https://www.elastic.co/licensing/elastic-license/faq)
- [OSI license definition and list](https://opensource.org/licenses)
