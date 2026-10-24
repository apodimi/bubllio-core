import { createHash, timingSafeEqual } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'

/** Verifies the presented secret without retaining or exposing its raw value. */
@Injectable()
export class SetupSecretService {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  matches(presentedSecret: string, now = new Date()): boolean {
    const expectedDigestHex = this.config.setup.secretSha256
    const expiresAt = this.config.setup.secretExpiresAt

    if (!expectedDigestHex || !expiresAt) {
      return false
    }

    if (now >= expiresAt) {
      return false
    }

    const presentedDigest = createHash('sha256').update(presentedSecret, 'utf8').digest()
    const expectedDigest = Buffer.from(expectedDigestHex, 'hex')

    // Both values are fixed-length SHA-256 digests, as required by timingSafeEqual.
    return timingSafeEqual(presentedDigest, expectedDigest)
  }
}
