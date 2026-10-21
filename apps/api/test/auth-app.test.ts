import { Test } from '@nestjs/testing'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module.js'

describe('authentication boundary', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    process.env.OIDC_ISSUER = 'https://identity.example.test/realms/bubllio'
    process.env.OIDC_AUDIENCE = 'bubllio-core-api'

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('allows endpoints explicitly marked as public', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('protects endpoints by default', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/me',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ message: 'Bearer token is required' })
  })
})
