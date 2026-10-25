import { describe, expect, it, vi } from 'vitest'

import { InstallationManifestRepository } from '../src/installation-manifest/installation-manifest.repository.js'
import { parseInstallationManifest } from '../src/installation-manifest/installation-manifest.schema.js'
import type { PrismaService } from '../src/prisma/prisma.service.js'

const manifest = {
  schemaVersion: '1',
  applications: [
    {
      key: 'bubllio-crm',
      displayName: 'CRM',
      launchUrl: 'https://crm.example.test',
      audience: 'bubllio-crm-api',
      contractVersion: '1',
    },
  ],
} as const

describe('installation application manifest', () => {
  it('accepts only the versioned data-only contract', () => {
    expect(parseInstallationManifest(manifest, 'production')).toEqual(manifest)
    expect(() =>
      parseInstallationManifest(
        {
          ...manifest,
          applications: [{ ...manifest.applications[0], image: 'registry.example/app:latest' }],
        },
        'production',
      ),
    ).toThrow('unknown or missing fields')
    expect(() =>
      parseInstallationManifest(
        {
          ...manifest,
          applications: [{ ...manifest.applications[0], command: ['rm', '-rf'] }],
        },
        'production',
      ),
    ).toThrow('unknown or missing fields')
  })

  it('rejects duplicate keys and insecure production launch URLs', () => {
    expect(() =>
      parseInstallationManifest(
        { ...manifest, applications: [...manifest.applications, ...manifest.applications] },
        'production',
      ),
    ).toThrow('duplicate key')
    expect(() =>
      parseInstallationManifest(
        {
          ...manifest,
          applications: [{ ...manifest.applications[0], launchUrl: 'http://crm.example.test' }],
        },
        'production',
      ),
    ).toThrow('secure URL')
  })

  it('reconciles metadata idempotently without creating organization access or member grants', async () => {
    const transaction = {
      application: { updateMany: vi.fn(), upsert: vi.fn() },
      organizationApplication: { create: vi.fn() },
      memberApplicationGrant: { create: vi.fn() },
    }
    const prisma = {
      $transaction: vi.fn((operation: (client: typeof transaction) => unknown) =>
        operation(transaction),
      ),
    }
    const repository = new InstallationManifestRepository(prisma as unknown as PrismaService)
    const parsed = parseInstallationManifest(manifest, 'production')

    await repository.reconcile(parsed)
    await repository.reconcile(parsed)

    expect(transaction.application.upsert).toHaveBeenCalledTimes(2)
    expect(transaction.application.upsert).toHaveBeenLastCalledWith({
      create: { ...manifest.applications[0], available: true, managedByManifest: true },
      update: { ...manifest.applications[0], available: true, managedByManifest: true },
      where: { key: 'bubllio-crm' },
    })
    expect(transaction.organizationApplication.create).not.toHaveBeenCalled()
    expect(transaction.memberApplicationGrant.create).not.toHaveBeenCalled()
  })
})
