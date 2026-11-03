import { NotFoundException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service.js'

/** A selected app must still be enabled and entitled when access is written. */
export async function requireAvailableApps(
  prisma: Pick<PrismaService, 'organizationApplication'>,
  organizationId: string,
  applicationKeys: string[],
): Promise<void> {
  if (applicationKeys.length === 0) return
  const apps = await prisma.organizationApplication.findMany({
    select: { applicationKey: true },
    where: {
      applicationKey: { in: applicationKeys },
      organizationId,
      enabled: true,
      entitled: true,
      application: { available: true },
    },
  })
  if (apps.length !== applicationKeys.length) {
    throw new NotFoundException('Application not available')
  }
}
