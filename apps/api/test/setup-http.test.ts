import { createHash, randomUUID } from 'node:crypto'

import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppModule } from '../src/app.module.js'
import { AuthService } from '../src/auth/auth.service.js'
import type { VerifiedSubject } from '../src/auth/identity.types.js'
import { PrismaService } from '../src/prisma/prisma.service.js'
import { EmailDeliveryRepository } from '../src/email-delivery/email-delivery.repository.js'
import { KeycloakOrganizationClient } from '../src/setup/keycloak-organization.client.js'
import { SetupRepository } from '../src/setup/setup.repository.js'
import { SetupProvisioningService } from '../src/setup/setup-provisioning.service.js'

const origin = 'http://127.0.0.1:5174'
const secret = 'a-setup-secret-with-256-bits-of-entropy-for-testing-only'
const subject = '00000000-0000-0000-0000-000000000002'
const repository = {
  claim: vi.fn(),
  readPublicStatus: vi.fn(),
}
const operationId = '00000000-0000-0000-0000-000000000021'
const operation = {
  id: operationId,
  status: 'awaiting_owner',
  organizationId: '00000000-0000-0000-0000-000000000022',
  correlationId: operationId,
  safeErrorCode: 'OWNER_INVITATION_PENDING',
  reauthenticationRequired: false,
  stages: [],
}
const provisioning = {
  current: vi.fn(),
  start: vi.fn(),
  read: vi.fn(),
  retry: vi.fn(),
}
const auth = { verify: vi.fn() }
const emailDelivery = { isReady: vi.fn(), status: vi.fn() }
const identityDirectory = { hasVerifiedEmail: vi.fn(), hasVerifiedAccount: vi.fn() }

function identity(overrides: Partial<VerifiedSubject> = {}): VerifiedSubject {
  return {
    audience: ['bubllio-core-api'],
    authenticatedAt: Math.floor(Date.now() / 1000) - 60,
    email: 'owner@example.test',
    emailVerified: true,
    issuer: 'https://identity.example.test/realms/bubllio',
    organization: {},
    subject,
    ...overrides,
  }
}

function claimHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    authorization: 'Bearer signed-test-token',
    'content-type': 'application/json',
    'idempotency-key': randomUUID(),
    origin,
    'x-bubllio-setup-secret': secret,
    ...overrides,
  }
}

describe('first-run setup HTTP boundary', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    process.env.WEB_ORIGIN = origin
    process.env.CORE_SETUP_CLAIM_ENABLED = 'true'
    process.env.CORE_SETUP_LOCAL_REHEARSAL = 'true'
    process.env.OIDC_ISSUER = 'http://127.0.0.1:8180/realms/bubllio'
    process.env.OIDC_AUDIENCE = 'bubllio-core-api'
    process.env.DATABASE_URL = 'postgresql://core:test@database:5432/core'
    process.env.CORE_SETUP_SECRET_SHA256 = createHash('sha256').update(secret).digest('hex')
    process.env.CORE_SETUP_SECRET_EXPIRES_AT = '2099-01-01T00:00:00.000Z'
    process.env.CORE_KEYCLOAK_ADMIN_URL = 'http://127.0.0.1:8180'
    process.env.CORE_KEYCLOAK_CLIENT_SECRET = 'test-client-secret-value'
    process.env.CORE_IDENTITY_SETUP_AGENT_URL = 'http://127.0.0.1:3200'
    process.env.CORE_IDENTITY_SETUP_AGENT_TOKEN = 'a'.repeat(32)

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(SetupRepository)
      .useValue(repository)
      .overrideProvider(EmailDeliveryRepository)
      .useValue(emailDelivery)
      .overrideProvider(KeycloakOrganizationClient)
      .useValue(identityDirectory)
      .overrideProvider(SetupProvisioningService)
      .useValue(provisioning)
      .overrideProvider(AuthService)
      .useValue(auth)
      .compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    auth.verify.mockResolvedValue(identity())
    repository.claim.mockResolvedValue({ outcome: 'claimed', version: 2 })
    repository.readPublicStatus.mockResolvedValue({ setupRequired: true, phase: 'new' })
    emailDelivery.isReady.mockResolvedValue(true)
    emailDelivery.status.mockResolvedValue({ status: 'ready' })
    identityDirectory.hasVerifiedEmail.mockResolvedValue(false)
    identityDirectory.hasVerifiedAccount.mockResolvedValue(false)
    provisioning.current.mockResolvedValue({ state: 'claimed' })
    provisioning.start.mockResolvedValue(operation)
    provisioning.read.mockResolvedValue(operation)
    provisioning.retry.mockResolvedValue(operation)
  })

  afterAll(async () => {
    await app.close()
    delete process.env.CORE_SETUP_SECRET_SHA256
    delete process.env.CORE_SETUP_SECRET_EXPIRES_AT
    delete process.env.WEB_ORIGIN
    delete process.env.CORE_SETUP_CLAIM_ENABLED
    delete process.env.CORE_SETUP_LOCAL_REHEARSAL
    delete process.env.CORE_KEYCLOAK_ADMIN_URL
    delete process.env.CORE_KEYCLOAK_CLIENT_SECRET
    delete process.env.CORE_IDENTITY_SETUP_AGENT_URL
    delete process.env.CORE_IDENTITY_SETUP_AGENT_TOKEN
    delete process.env.OIDC_ISSUER
  })

  it('exposes only the coarse public setup state with no-store headers', async () => {
    repository.readPublicStatus.mockResolvedValueOnce({ setupRequired: false, phase: 'ready' })
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/setup/status',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      setupRequired: false,
      phase: 'ready',
      registrationRequired: false,
    })
    expect(response.headers['cache-control']).toBe('no-store, max-age=0')
    expect(auth.verify).not.toHaveBeenCalled()
  })

  it('closes public registration after a verified account exists while setup remains new', async () => {
    identityDirectory.hasVerifiedAccount.mockResolvedValueOnce(true)
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/setup/status',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      setupRequired: true,
      phase: 'new',
      registrationRequired: false,
    })
    expect(identityDirectory.hasVerifiedAccount).toHaveBeenCalledOnce()
  })

  it('keeps registration available until the first account is verified', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/setup/status',
    })

    expect(response.json()).toEqual({
      setupRequired: true,
      phase: 'new',
      registrationRequired: true,
    })
  })

  it('does not query identity after setup is claimed', async () => {
    repository.readPublicStatus.mockResolvedValueOnce({
      setupRequired: true,
      phase: 'in_progress',
    })
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/setup/status',
    })

    expect(response.json()).toEqual({
      setupRequired: true,
      phase: 'in_progress',
      registrationRequired: false,
    })
    expect(identityDirectory.hasVerifiedAccount).not.toHaveBeenCalled()
  })

  it('claims an installation for the verified subject and supports replay', async () => {
    const key = randomUUID()
    const headers = claimHeaders({ 'idempotency-key': key })
    const first = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/v1/setup/claim',
      headers,
      payload: {},
    })
    expect(first.statusCode).toBe(201)
    expect(first.json()).toEqual({ status: 'claimed' })
    expect(first.headers['cache-control']).toBe('no-store, max-age=0')
    expect(repository.claim).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: key, subject }),
    )

    repository.claim.mockResolvedValueOnce({ outcome: 'replayed', version: 2 })
    const replay = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/v1/setup/claim',
      headers,
      payload: {},
    })
    expect(replay.statusCode).toBe(200)
    expect(replay.json()).toEqual({ status: 'claimed' })
  })

  it('claims with a recent legacy token after directory email verification', async () => {
    auth.verify.mockResolvedValueOnce(
      identity({ email: undefined, emailVerified: undefined, organization: {} }),
    )
    identityDirectory.hasVerifiedEmail.mockResolvedValueOnce(true)

    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/v1/setup/claim',
      headers: claimHeaders(),
      payload: {},
    })

    expect(response.statusCode).toBe(201)
    expect(identityDirectory.hasVerifiedEmail).toHaveBeenCalledWith(subject)
    expect(repository.claim).toHaveBeenCalledWith(expect.objectContaining({ subject }))
  })

  it('denies account claim until email delivery is ready', async () => {
    emailDelivery.isReady.mockResolvedValueOnce(false)
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/v1/setup/claim',
      headers: claimHeaders(),
      payload: {},
    })
    expect(response.statusCode).toBe(404)
    expect(repository.claim).not.toHaveBeenCalled()
  })

  it('rejects an unauthenticated claim before checking the secret', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/setup/claim',
        headers: claimHeaders({ authorization: '' }),
        payload: {},
      })
    expect(response.statusCode).toBe(401)
    expect(repository.claim).not.toHaveBeenCalled()
  })

  it('uses the startup configuration snapshot instead of re-reading environment values', async () => {
    delete process.env.CORE_SETUP_CLAIM_ENABLED
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/v1/setup/claim',
      headers: claimHeaders(),
      payload: {},
    })
    expect(response.statusCode).toBe(201)
    expect(repository.claim).toHaveBeenCalledTimes(1)
    process.env.CORE_SETUP_CLAIM_ENABLED = 'true'
  })

  it.each([
    ['unverified email', identity({ emailVerified: false }), claimHeaders(), {}],
    ['stale authentication', identity({ authenticatedAt: 1 }), claimHeaders(), {}],
  ])('rejects %s', async (_name, caller, headers, payload) => {
    auth.verify.mockResolvedValueOnce(caller)
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/v1/setup/claim',
      headers,
      payload,
    })
    expect(response.statusCode).toBe(401)
    expect(repository.claim).not.toHaveBeenCalled()
  })

  it.each([
    ['wrong secret', claimHeaders({ 'x-bubllio-setup-secret': 'wrong' }), {}],
    ['wrong origin', claimHeaders({ origin: 'https://attacker.example' }), {}],
    ['missing origin', claimHeaders({ origin: '' }), {}],
  ])('hides setup from a request with %s', async (_name, headers, payload) => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/v1/setup/claim',
      headers,
      payload,
    })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ code: 'SETUP_UNAVAILABLE' })
    expect(repository.claim).not.toHaveBeenCalled()
  })

  it.each([
    ['missing idempotency key', claimHeaders({ 'idempotency-key': '' }), {}],
    ['malformed idempotency key', claimHeaders({ 'idempotency-key': 'bad' }), {}],
    ['extra body field', claimHeaders(), { subject: 'attacker' }],
  ])('rejects %s without changing state', async (_name, headers, payload) => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/v1/setup/claim',
      headers,
      payload,
    })
    expect(response.statusCode).toBe(422)
    expect(repository.claim).not.toHaveBeenCalled()
  })

  it('returns a generic conflict for a competing claimant', async () => {
    repository.claim.mockResolvedValueOnce({ outcome: 'conflict' })
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/v1/setup/claim',
      headers: claimHeaders(),
      payload: {},
    })
    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ code: 'SETUP_CLAIM_CONFLICT' })
    expect(response.body).not.toContain(subject)
  })

  it('resumes only the authenticated claimant and starts an idempotent organization intent', async () => {
    const current = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'GET',
        url: '/api/v1/setup/current',
        headers: { authorization: 'Bearer signed-test-token' },
      })
    expect(current.statusCode).toBe(200)
    expect(current.json()).toEqual({ state: 'claimed' })
    expect(provisioning.current).toHaveBeenCalledWith(expect.objectContaining({ subject }))

    const headers = claimHeaders()
    const created = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/setup/organization',
        headers,
        payload: { displayName: 'Example Team' },
      })
    expect(created.statusCode).toBe(202)
    expect(created.json()).toMatchObject({ id: operationId, status: 'awaiting_owner' })
    expect(provisioning.start).toHaveBeenCalledWith(
      expect.objectContaining({ subject }),
      'Example Team',
      headers['idempotency-key'],
    )
  })

  it('protects operation retry with the setup secret and exact browser origin', async () => {
    const denied = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: `/api/v1/setup/operations/${operationId}/retry`,
        headers: claimHeaders({ 'x-bubllio-setup-secret': 'wrong' }),
        payload: {},
      })
    expect(denied.statusCode).toBe(404)
    expect(provisioning.retry).not.toHaveBeenCalled()

    const allowed = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: `/api/v1/setup/operations/${operationId}/retry`,
        headers: claimHeaders(),
        payload: {},
      })
    expect(allowed.statusCode).toBe(202)
    expect(provisioning.retry).toHaveBeenCalledWith(
      expect.objectContaining({ subject }),
      operationId,
    )
  })
})
