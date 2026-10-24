import { Test } from '@nestjs/testing'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

describe('authentication boundary', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    process.env.OIDC_ISSUER = 'https://identity.example.test/realms/bubllio'
    process.env.OIDC_AUDIENCE = 'bubllio-core-api'
    process.env.DATABASE_URL = 'postgresql://core:test@database:5432/core'

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('allows endpoints explicitly marked as public', async () => {
    for (const url of ['/health', '/health/live']) {
      const response = await app.getHttpAdapter().getInstance().inject({ method: 'GET', url })
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ status: 'ok' })
    }
  })

  it('protects endpoints by default', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/me',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ message: 'Bearer token is required' })
  })

  it('protects workspace and app management endpoints by default', async () => {
    for (const [method, url] of [
      ['GET', '/api/v1/me/organizations'],
      ['GET', '/api/v1/organizations/00000000-0000-0000-0000-000000000001/applications'],
      ['POST', '/api/v1/applications'],
    ] as const) {
      const response = await app.getHttpAdapter().getInstance().inject({ method, url })
      expect(response.statusCode).toBe(401)
    }
  })
})
