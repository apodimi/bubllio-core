import { createHash, createHmac } from 'node:crypto'
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EmailDeliveryRepository } from '../src/email-delivery/email-delivery.repository.js'
import {
  parseEmailConfirmInput,
  parseEmailTestInput,
} from '../src/email-delivery/email-delivery.schema.js'
import { EmailDeliveryService } from '../src/email-delivery/email-delivery.service.js'
import { IdentitySetupAgentClient } from '../src/email-delivery/identity-setup-agent.client.js'
import { AgentAuthGuard } from '../src/identity-setup-agent/agent-auth.guard.js'
import {
  EmailSetupAgentService,
  SMTP_PASSWORD_VAULT_FILENAME,
} from '../src/identity-setup-agent/email-setup-agent.service.js'
import { parseIdentitySetupAgentConfig } from '../src/identity-setup-agent/identity-setup-agent.config.js'
import { KeycloakEmailSetupClient } from '../src/identity-setup-agent/keycloak-email-setup.client.js'
import type { RuntimeConfig } from '../src/config/runtime-config.js'
import { SetupProblemFilter } from '../src/setup/setup-problem.filter.js'

const input = {
  senderName: 'Bubllio',
  senderEmail: 'mail@example.test',
  host: 'smtp.example.test',
  port: 587,
  security: 'starttls' as const,
  authentication: true,
  username: 'mailer',
  password: 'super-secret',
  testRecipient: 'owner@example.test',
}
const config = {
  environment: 'production',
  setup: { secretSha256: createHash('sha256').update('setup').digest('hex') },
} as RuntimeConfig

describe('email delivery setup', () => {
  it('validates strict SMTP and confirmation inputs', () => {
    expect(parseEmailTestInput(input, 'production')).toEqual(input)
    expect(() => parseEmailTestInput({ ...input, security: 'none' }, 'production')).toThrow()
    expect(() => parseEmailConfirmInput({ code: 123456 })).toThrow()
    expect(parseEmailConfirmInput({ code: '123456' })).toEqual({ code: '123456' })
  })

  it('exposes only the durable confirmation recovery flag for attention state', async () => {
    const repository = new EmailDeliveryRepository({
      emailDeliverySetup: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          status: 'ATTENTION',
          safeErrorCode: 'IDENTITY_ACTIVATION_FAILED',
          confirmationRetryable: true,
        }),
      },
    } as never)
    await expect(repository.status()).resolves.toEqual({
      status: 'attention',
      safeErrorCode: 'IDENTITY_ACTIVATION_FAILED',
      confirmationRetryable: true,
    })
  })

  it('uses compare-and-swap so only one concurrent SMTP reservation wins', async () => {
    let version = 1
    const transaction = {
      installationSetup: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ status: 'NOT_STARTED' }),
      },
      emailDeliverySetup: {
        findUniqueOrThrow: vi
          .fn()
          .mockImplementation(() =>
            Promise.resolve({ status: 'REQUIRED', version: 1, testIdempotencyKey: null }),
          ),
        updateMany: vi.fn().mockImplementation(({ where }: { where: { version: number } }) => {
          if (where.version !== version) return Promise.resolve({ count: 0 })
          version += 1
          return Promise.resolve({ count: 1 })
        }),
      },
    }
    const repository = new EmailDeliveryRepository({
      $transaction: (callback: (tx: unknown) => unknown) => callback(transaction),
    } as never)
    const payload = {
      codeExpiresAt: new Date(),
      codeHmac: 'a'.repeat(64),
      fingerprint: 'b'.repeat(64),
    }
    const results = await Promise.all([
      repository.reserveTest({ ...payload, idempotencyKey: 'one' }),
      repository.reserveTest({ ...payload, idempotencyKey: 'two' }),
    ])
    expect(results.map((result) => result.outcome).sort()).toEqual(['conflict', 'reserved'])
  })

  it('does not retry or report success for a same-key failed test', async () => {
    const repository = {
      reserveTest: vi
        .fn()
        .mockResolvedValue({ outcome: 'failed', safeErrorCode: 'EMAIL_DELIVERY_TLS_FAILED' }),
    }
    const agent = { testEmail: vi.fn() }
    const service = new EmailDeliveryService(
      repository as unknown as EmailDeliveryRepository,
      agent as unknown as IdentitySetupAgentClient,
      config,
    )
    await expect(
      service.test(input, '00000000-0000-4000-8000-000000000001'),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(agent.testEmail).not.toHaveBeenCalled()
  })

  it('replays a completed same-key test without sending a second email', async () => {
    const repository = { reserveTest: vi.fn().mockResolvedValue({ outcome: 'replayed' }) }
    const agent = { testEmail: vi.fn() }
    const service = new EmailDeliveryService(
      repository as unknown as EmailDeliveryRepository,
      agent as unknown as IdentitySetupAgentClient,
      config,
    )
    await expect(
      service.test(input, '00000000-0000-4000-8000-000000000001'),
    ).resolves.toMatchObject({ status: 'awaiting_confirmation' })
    expect(agent.testEmail).not.toHaveBeenCalled()
  })

  it('stops at five attempts and records expiry without finalizing', async () => {
    const agent = { finalizeEmail: vi.fn() }
    const maxed = new EmailDeliveryService(
      {
        challenge: vi.fn().mockResolvedValue({
          status: 'AWAITING_CONFIRMATION',
          codeAttemptCount: 5,
          codeExpiresAt: new Date(Date.now() + 10_000),
          codeHmac: 'a'.repeat(64),
          configurationFingerprint: 'b'.repeat(64),
        }),
      } as unknown as EmailDeliveryRepository,
      agent as unknown as IdentitySetupAgentClient,
      config,
    )
    await expect(maxed.confirm({ code: '123456' }, 'key')).rejects.toBeInstanceOf(ConflictException)
    expect(agent.finalizeEmail).not.toHaveBeenCalled()

    const recordInvalidConfirmation = vi.fn()
    const expired = new EmailDeliveryService(
      {
        challenge: vi.fn().mockResolvedValue({
          status: 'AWAITING_CONFIRMATION',
          codeAttemptCount: 0,
          codeExpiresAt: new Date(0),
          codeHmac: 'a'.repeat(64),
          configurationFingerprint: 'b'.repeat(64),
        }),
        recordInvalidConfirmation,
      } as unknown as EmailDeliveryRepository,
      agent as unknown as IdentitySetupAgentClient,
      config,
    )
    await expect(expired.confirm({ code: '123456' }, 'key')).rejects.toBeInstanceOf(
      ConflictException,
    )
    expect(recordInvalidConfirmation).toHaveBeenCalledWith('EMAIL_CONFIRMATION_EXPIRED')
  })

  it('retries confirmation attention only when durable recovery says it is safe', async () => {
    const fingerprint = 'b'.repeat(64)
    const code = '123456'
    const codeHmac = createHmac('sha256', Buffer.from(config.setup.secretSha256!, 'hex'))
      .update(`${fingerprint}:${code}`, 'utf8')
      .digest('hex')
    const agent = { finalizeEmail: vi.fn() }
    const challenge = {
      status: 'ATTENTION',
      codeAttemptCount: 0,
      codeExpiresAt: new Date(Date.now() + 10_000),
      codeHmac,
      configurationFingerprint: fingerprint,
    }
    const blocked = new EmailDeliveryService(
      {
        challenge: vi.fn().mockResolvedValue({ ...challenge, confirmationRetryable: false }),
      } as unknown as EmailDeliveryRepository,
      agent as unknown as IdentitySetupAgentClient,
      config,
    )
    await expect(blocked.confirm({ code }, 'key')).rejects.toBeInstanceOf(ConflictException)
    expect(agent.finalizeEmail).not.toHaveBeenCalled()

    const markReady = vi.fn()
    const retryable = new EmailDeliveryService(
      {
        challenge: vi.fn().mockResolvedValue({ ...challenge, confirmationRetryable: true }),
        markReady,
      } as unknown as EmailDeliveryRepository,
      agent as unknown as IdentitySetupAgentClient,
      config,
    )
    await expect(retryable.confirm({ code }, 'key')).resolves.toEqual({ status: 'ready' })
    expect(agent.finalizeEmail).toHaveBeenCalledWith(fingerprint)
    expect(markReady).toHaveBeenCalled()
  })

  it('sends credentials only to the private agent and persists only keyed digests', async () => {
    const repository = {
      reserveTest: vi.fn().mockResolvedValue({ outcome: 'reserved' }),
      markTestSent: vi.fn(),
    }
    const agent = { testEmail: vi.fn() }
    const service = new EmailDeliveryService(
      repository as unknown as EmailDeliveryRepository,
      agent as unknown as IdentitySetupAgentClient,
      config,
    )
    await expect(
      service.test(input, '00000000-0000-4000-8000-000000000001'),
    ).resolves.toMatchObject({ maskedRecipient: 'o****@example.test' })
    const reserved = repository.reserveTest.mock.calls[0]![0]
    expect(JSON.stringify(reserved)).not.toContain(input.password)
    expect(JSON.stringify(reserved)).not.toContain(input.testRecipient)
    expect(reserved.fingerprint).toMatch(/^[a-f0-9]{64}$/u)
    expect(agent.testEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        password: input.password,
        confirmationCode: expect.stringMatching(/^\d{6}$/u),
      }),
    )
  })
})

describe('identity setup agent boundary', () => {
  it('rejects missing and wrong bearer tokens', () => {
    const guard = new AgentAuthGuard({ token: 'a'.repeat(32) } as never)
    const context = (authorization?: string) =>
      ({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }) }) as never
    expect(() => guard.canActivate(context())).toThrow(NotFoundException)
    expect(() => guard.canActivate(context(`Bearer ${'b'.repeat(32)}`))).toThrow(NotFoundException)
    expect(guard.canActivate(context(`Bearer ${'a'.repeat(32)}`))).toBe(true)
  })

  it('stores the exact vault file with 0600 mode and removes it for no-auth', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'bubllio-vault-'))
    const service = new EmailSetupAgentService({ vaultDirectory: directory } as never, {} as never)
    const store = Reflect.get(service, 'storePassword').bind(service) as (
      password: string | undefined,
    ) => Promise<void>
    await store('only-the-smtp-password')
    const path = join(directory, SMTP_PASSWORD_VAULT_FILENAME)
    expect(SMTP_PASSWORD_VAULT_FILENAME).toBe('bubllio_smtp__password')
    expect(await readFile(path, 'utf8')).toBe('only-the-smtp-password')
    expect((await stat(path)).mode & 0o777).toBe(0o600)
    await store(undefined)
    await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('fails closed on missing secrets and a public insecure Keycloak URL', async () => {
    expect(() => parseIdentitySetupAgentConfig({})).toThrow()
    const directory = await mkdtemp(join(tmpdir(), 'bubllio-config-'))
    const secretFile = join(directory, 'secret')
    await writeFile(secretFile, 'a'.repeat(32))
    expect(() =>
      parseIdentitySetupAgentConfig({
        IDENTITY_SETUP_AGENT_TOKEN_FILE: secretFile,
        KEYCLOAK_BOOTSTRAP_CLIENT_SECRET_FILE: secretFile,
        KEYCLOAK_RUNTIME_CLIENT_SECRET_FILE: secretFile,
        KEYCLOAK_ADMIN_URL: 'http://public.example.test:8080',
      }),
    ).toThrow(/HTTPS/u)
  })
})

describe('safe setup errors', () => {
  it('preserves only whitelisted email codes and drops provider detail', () => {
    const sent: unknown[] = []
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({
          header: vi.fn(),
          status: () => ({ send: (body: unknown) => sent.push(body) }),
        }),
      }),
    } as never
    const filter = new SetupProblemFilter()
    filter.catch(new ConflictException('EMAIL_DELIVERY_TLS_FAILED'), host)
    filter.catch(new ConflictException('smtp password=leaked provider detail'), host)
    expect(sent[0]).toMatchObject({ code: 'EMAIL_DELIVERY_TLS_FAILED' })
    expect(sent[1]).toMatchObject({ code: 'SETUP_CLAIM_CONFLICT' })
    expect(JSON.stringify(sent)).not.toContain('password=leaked')
  })
})

describe('Keycloak email bootstrap', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('writes the vault expression and keeps registration closed during test', async () => {
    const responses = [
      new Response(JSON.stringify({ access_token: 'bootstrap-token' }), { status: 200 }),
      new Response(JSON.stringify({ attributes: {} }), { status: 200 }),
      new Response(null, { status: 204 }),
    ]
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()))
    vi.stubGlobal('fetch', fetchMock)
    const client = new KeycloakEmailSetupClient({
      keycloakAdminUrl: 'http://keycloak:8080',
      bootstrapClientSecret: 'bootstrap-secret',
      runtimeClientSecret: 'runtime-secret',
    } as never)
    await client.configureTest(input, 'a'.repeat(64))
    const update = fetchMock.mock.calls[2]![1] as RequestInit
    const realm = JSON.parse(String(update.body))
    expect(realm.registrationAllowed).toBe(false)
    expect(realm.smtpServer.password).toBe('${vault.smtp_password}')
    expect(String(update.body)).not.toContain(input.password)
  })

  it('disables the exact bootstrap client, proves invalid_client, and reconciles READY', async () => {
    const fingerprint = 'a'.repeat(64)
    const responses = [
      new Response(JSON.stringify({ access_token: 'bootstrap-token' }), { status: 200 }),
      new Response(
        JSON.stringify({
          registrationAllowed: false,
          attributes: { 'bubllio.email_delivery_fingerprint': fingerprint },
        }),
        { status: 200 },
      ),
      new Response(null, { status: 204 }),
      new Response(
        JSON.stringify([{ id: 'bootstrap-id', clientId: 'bubllio-identity-bootstrap' }]),
        { status: 200 },
      ),
      new Response(null, { status: 204 }),
      new Response(JSON.stringify({ error: 'invalid_client' }), { status: 401 }),
      new Response(JSON.stringify({ access_token: 'runtime-token' }), { status: 200 }),
      new Response(
        JSON.stringify({
          registrationAllowed: true,
          attributes: {
            'bubllio.email_delivery_fingerprint': fingerprint,
            'bubllio.email_delivery_stage': 'READY',
          },
        }),
        { status: 200 },
      ),
    ]
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()))
    vi.stubGlobal('fetch', fetchMock)
    const client = new KeycloakEmailSetupClient({
      keycloakAdminUrl: 'http://keycloak:8080',
      bootstrapClientSecret: 'bootstrap-secret',
      runtimeClientSecret: 'runtime-secret',
    } as never)
    await expect(client.finalize(fingerprint)).resolves.toBeUndefined()
    expect(String(fetchMock.mock.calls[3]![0])).toContain('clientId=bubllio-identity-bootstrap')
    expect(String(fetchMock.mock.calls[4]![0])).toContain('/clients/bootstrap-id')
    expect(JSON.parse(String((fetchMock.mock.calls[4]![1] as RequestInit).body))).toMatchObject({
      enabled: false,
      serviceAccountsEnabled: false,
    })
    const tokenBodies = fetchMock.mock.calls
      .filter((call) => String(call[0]).endsWith('/token'))
      .map((call) => String((call[1] as RequestInit).body))
    expect(tokenBodies).toEqual([
      expect.stringContaining('client_id=bubllio-identity-bootstrap'),
      expect.stringContaining('client_id=bubllio-identity-bootstrap'),
      expect.stringContaining('client_id=bubllio-core-runtime'),
    ])
  })
})
