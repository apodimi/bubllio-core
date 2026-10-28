# ADR 0012: Isolate email bootstrap authority

- Status: Accepted; amended 2026-10-28 for invite-only enrollment
- Date: 2026-10-24

## Context

The UI-first installation journey in
[ADR 0011](0011-portable-delivery-and-ui-first-setup.md) must configure and
prove email delivery before the first administrator can register. Keycloak
sends identity email, so its realm SMTP configuration is authoritative.
However, changing that configuration and opening registration require realm
administration that the permanent Core runtime must not hold.

Copying the SMTP password into Core persistence would create another secret
store, broaden incident scope, and complicate rotation and deletion. Giving the
browser or permanent Core runtime a Keycloak realm-administration credential
would turn a one-time installation capability into ongoing ambient authority.
Keycloak's administrator test-email endpoint also targets the authenticated
administrator, which does not exist yet in this journey.

## Decision

Email setup uses a separate, temporary identity setup agent on the private
installation network. The browser talks only to Core. Core authenticates the
operator's one-time setup secret, applies exact-origin, request-size,
idempotency, and rate-limit controls, then forwards one bounded command to the
agent with an independent internal token.

The agent:

1. validates the complete SMTP input again;
2. sends a minimal, untracked test message containing a short-lived six-digit
   confirmation code;
3. writes an authenticated SMTP password atomically to Keycloak's file-vault
   slot and configures the realm to reference that slot;
4. keeps browser registration closed while confirmation is pending;
5. after Core proves the confirmation code, opens registration for the first
   verified administrator and writes a non-secret configuration fingerprint and
   readiness marker;
6. when that administrator also proves the one-time installation secret, closes
   public realm registration before Core records the claim, then disables its
   own bootstrap client and proves that it can no longer obtain a token.

The bootstrap client has only the exact realm-management roles needed for this
ceremony. The permanent Core runtime does not receive mutation authority. It
may receive read-only realm access to reconcile the readiness marker after a
crash between Keycloak finalization and Core persistence.

Core never stores the SMTP password, SMTP username, host, sender address, test
recipient, message body, raw provider response, bootstrap client secret, or the
operator's raw setup secret. Core stores only a sanitized state, timestamps, a
configuration fingerprint, a keyed confirmation-code digest, expiry and
attempt counters, and bounded error codes. A non-secret recovery flag records
whether an attention state can retry the existing confirmation after a restart;
it never contains delivery input. The test recipient mask is returned only by
the test request and is not durable. Browser storage, URLs, logs, traces,
analytics, audit payloads, screenshots, and support evidence must not contain
any of those secrets or delivery inputs.

The email state is independent from the organization-provisioning state:

```text
REQUIRED
  -> AWAITING_CONFIRMATION
  -> READY

Any recoverable failure -> NEEDS_ATTENTION -> AWAITING_CONFIRMATION
```

Account registration and the existing dual-proof installation claim remain
unavailable until email reaches `READY`. The temporary open-registration period
ends at claim, and future account creation requires an organization invitation.
Setup retries are idempotent and a restart reconciles non-secret Keycloak
markers instead of asking the operator to reinstall.

Authenticated SMTP without transport encryption is rejected. An
unauthenticated plaintext relay, if enabled by deployment policy, is limited to
an explicitly trusted private network and is not an external-alpha default.

## Alternatives considered

- Give the permanent Core client `manage-realm`: rejected because compromise
  would grant lasting identity-control authority unrelated to normal Core work.
- Call Keycloak directly from the browser: rejected because it exposes a
  privileged administrative surface and cannot safely hold bootstrap
  credentials.
- Store SMTP credentials in the Core database and synchronize them to
  Keycloak: rejected because it duplicates sensitive state without product
  value.
- Use Keycloak's administrator test-email endpoint: rejected because the
  pre-account journey has no human administrator identity to receive its test.
- Require console or environment-file SMTP configuration: rejected because it
  breaks the UI-first happy path accepted in ADR 0011.

## Consequences

- The release contains a fifth, internal-only setup-agent image and a private
  secret exchange between Core and that agent.
- The deployment adapter provides a Keycloak vault volume, two independent
  bootstrap secrets, no public route to the agent, and one restricted SMTP
  egress network shared only by the agent and Keycloak. This keeps the test and
  runtime identity mail on the same reviewed network path.
- The setup agent may remain process-healthy for deployment orchestration, but
  its Keycloak mutation authority is unavailable after successful retirement;
  normal product requests never depend on it.
- The bootstrap client remains active between email confirmation and the first
  verified secret claim. Keep the agent private and its token isolated. A
  failed registration closure blocks that claim; an installation completed by
  an older release needs an explicit realm-setting migration.
- SMTP credential rotation remains a deliberate recovery or later owner-admin
  capability and must use a fresh bounded authority rather than reactivating the
  original bootstrap client invisibly.
- External alpha still requires provider, deliverability, abuse-control,
  privacy-notice, processor, transfer, retention, and human approval gates. A
  passing technical setup flow is not GDPR certification or release approval.
