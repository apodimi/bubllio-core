import { Injectable } from '@nestjs/common'

import { InstallationSetupStatus } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'

export interface ClaimSetupInput {
  claimedAt: Date
  claimExpiresAt: Date
  idempotencyKey: string
  subject: string
}

export type ClaimSetupResult =
  { outcome: 'claimed' | 'replayed'; version: number } | { outcome: 'conflict' }

export interface PublicSetupStatus {
  setupRequired: boolean
  phase: 'new' | 'in_progress' | 'ready'
}

/** Owns the compare-and-set boundary for the single installation setup row. */
@Injectable()
export class SetupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async readPublicStatus(): Promise<PublicSetupStatus> {
    const setup = await this.prisma.installationSetup.findUniqueOrThrow({
      select: { status: true },
      where: { id: 1 },
    })

    if (setup.status === InstallationSetupStatus.READY) {
      return { setupRequired: false, phase: 'ready' }
    }
    return {
      setupRequired: true,
      phase: setup.status === InstallationSetupStatus.NOT_STARTED ? 'new' : 'in_progress',
    }
  }

  async claim(input: ClaimSetupInput): Promise<ClaimSetupResult> {
    return this.prisma.$transaction(async (transaction) => {
      const claim = await transaction.installationSetup.updateMany({
        data: {
          claimedAt: input.claimedAt,
          claimedBySubject: input.subject,
          claimExpiresAt: input.claimExpiresAt,
          claimIdempotencyKey: input.idempotencyKey,
          status: InstallationSetupStatus.CLAIMED,
          version: { increment: 1 },
        },
        where: {
          id: 1,
          status: InstallationSetupStatus.NOT_STARTED,
        },
      })

      const setup = await transaction.installationSetup.findUniqueOrThrow({
        select: {
          claimedBySubject: true,
          claimIdempotencyKey: true,
          status: true,
          version: true,
        },
        where: { id: 1 },
      })

      if (claim.count === 1) {
        return { outcome: 'claimed', version: setup.version }
      }

      if (
        setup.status === InstallationSetupStatus.CLAIMED &&
        setup.claimedBySubject === input.subject &&
        setup.claimIdempotencyKey === input.idempotencyKey
      ) {
        return { outcome: 'replayed', version: setup.version }
      }

      return { outcome: 'conflict' }
    })
  }
}
