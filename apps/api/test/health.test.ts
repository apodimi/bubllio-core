import { afterEach, describe, expect, it, vi } from 'vitest'

import { HealthService } from '../src/health/health.service.js'
import type { InstallationManifestService } from '../src/installation-manifest/installation-manifest.service.js'
import type { PrismaService } from '../src/prisma/prisma.service.js'
import { runtimeConfig } from './runtime-config.fixture.js'

function response(body: unknown, ok = true): Response {
  return { json: async () => body, ok } as Response
}

describe('system readiness', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reports all required dependencies without exposing internal details', async () => {
    const prisma = {
      $queryRawUnsafe: vi.fn(async (query: string) =>
        query.includes('required_count') ? [{ required_count: 1, incomplete_count: 0 }] : [],
      ),
    }
    const manifest = { status: () => ({ configured: true }) }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          response({
            issuer: 'https://identity.example.test/realms/bubllio',
            jwks_uri: 'https://identity.example.test/certs',
          }),
        )
        .mockResolvedValueOnce(response({ keys: [{ kid: 'test' }] })),
    )
    const service = new HealthService(
      runtimeConfig(),
      prisma as unknown as PrismaService,
      manifest as unknown as InstallationManifestService,
    )

    expect(await service.readiness()).toEqual({
      status: 'ready',
      checks: {
        database: 'ready',
        identity: 'ready',
        migrations: 'ready',
        applications: 'ready',
      },
    })
  })

  it('degrades safely without returning an exception or endpoint details', async () => {
    const prisma = { $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('secret db host')) }
    const manifest = { status: () => ({ configured: false }) }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret identity host')))
    const service = new HealthService(
      runtimeConfig({ environment: 'production' }),
      prisma as unknown as PrismaService,
      manifest as unknown as InstallationManifestService,
    )

    const result = await service.readiness()
    expect(result.status).toBe('unavailable')
    expect(result.checks).toEqual({
      database: 'unavailable',
      identity: 'unavailable',
      migrations: 'unavailable',
      applications: 'unavailable',
    })
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(JSON.stringify(result)).not.toContain('http')

    expect(await service.preflight()).toEqual({
      status: 'attention',
      checks: [
        {
          key: 'database',
          status: 'attention',
          messageCode: 'SYSTEM_DATABASE_UNAVAILABLE',
        },
        {
          key: 'identity',
          status: 'attention',
          messageCode: 'SYSTEM_IDENTITY_UNAVAILABLE',
        },
        { key: 'migrations', status: 'attention', messageCode: 'SYSTEM_UPDATE_REQUIRED' },
        {
          key: 'applications',
          status: 'attention',
          messageCode: 'APPLICATION_MANIFEST_UNAVAILABLE',
        },
      ],
    })
  })
})
