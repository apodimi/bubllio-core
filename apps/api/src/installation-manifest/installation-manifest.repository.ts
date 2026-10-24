import { Injectable } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service.js'
import type { InstallationManifest } from './installation-manifest.schema.js'

/** Reconciles catalog metadata only; organization availability and member grants remain untouched. */
@Injectable()
export class InstallationManifestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async reconcile(manifest: InstallationManifest): Promise<void> {
    const installedKeys = manifest.applications.map(({ key }) => key)
    await this.prisma.$transaction(async (transaction) => {
      await transaction.application.updateMany({
        data: { available: false },
        where: {
          managedByManifest: true,
          ...(installedKeys.length ? { key: { notIn: installedKeys } } : {}),
        },
      })

      for (const application of manifest.applications) {
        await transaction.application.upsert({
          create: { ...application, available: true, managedByManifest: true },
          update: { ...application, available: true, managedByManifest: true },
          where: { key: application.key },
        })
      }
    })
  }
}
