import { createHash, timingSafeEqual } from 'node:crypto'

import { Injectable } from '@nestjs/common'

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u

/** Verifies the presented secret without retaining or exposing its raw value. */
@Injectable()
export class SetupSecretService {
  matches(presentedSecret: string, now = new Date()): boolean {
    const expectedDigestHex = process.env.CORE_SETUP_SECRET_SHA256
    const expiresAtValue = process.env.CORE_SETUP_SECRET_EXPIRES_AT

    if (!expectedDigestHex || !SHA256_HEX_PATTERN.test(expectedDigestHex) || !expiresAtValue) {
      return false
    }

    const expiresAt = new Date(expiresAtValue)
    if (!Number.isFinite(expiresAt.getTime()) || now >= expiresAt) {
      return false
    }

    const presentedDigest = createHash('sha256').update(presentedSecret, 'utf8').digest()
    const expectedDigest = Buffer.from(expectedDigestHex, 'hex')

    // Both values are fixed-length SHA-256 digests, as required by timingSafeEqual.
    return timingSafeEqual(presentedDigest, expectedDigest)
  }
}
