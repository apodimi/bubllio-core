import { describe, expect, it, vi } from 'vitest'

import { InstallationSetupStatus } from '../src/generated/prisma/enums.js'
import { SetupRepository } from '../src/setup/setup.repository.js'
import type { PrismaService } from '../src/prisma/prisma.service.js'

describe('public installation phase', () => {
  it.each([
    [InstallationSetupStatus.NOT_STARTED, { setupRequired: true, phase: 'new' }],
    [InstallationSetupStatus.CLAIMED, { setupRequired: true, phase: 'in_progress' }],
    [InstallationSetupStatus.PROVISIONING, { setupRequired: true, phase: 'in_progress' }],
    [InstallationSetupStatus.NEEDS_ATTENTION, { setupRequired: true, phase: 'in_progress' }],
    [InstallationSetupStatus.READY, { setupRequired: false, phase: 'ready' }],
  ])('maps %s to %j without exposing the owner', async (status, expected) => {
    const findUniqueOrThrow = vi.fn().mockResolvedValue({ status })
    const repository = new SetupRepository({
      installationSetup: { findUniqueOrThrow },
    } as unknown as PrismaService)

    await expect(repository.readPublicStatus()).resolves.toEqual(expected)
    expect(findUniqueOrThrow).toHaveBeenCalledWith({
      select: { status: true },
      where: { id: 1 },
    })
  })
})
