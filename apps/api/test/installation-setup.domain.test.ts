import { describe, expect, it } from 'vitest'

import {
  claimInstallationSetup,
  InstallationSetupTransitionError,
  type InstallationSetupState,
} from '../src/setup/domain/installation-setup.js'

const notStarted: InstallationSetupState = {
  status: 'NOT_STARTED',
  version: 1,
}

describe('claimInstallationSetup', () => {
  it('binds an uninitialized installation to the immutable subject and idempotency key', () => {
    const claimedAt = new Date('2026-10-23T10:00:00.000Z')
    const claimExpiresAt = new Date('2026-10-23T10:30:00.000Z')

    expect(
      claimInstallationSetup(notStarted, {
        claimedAt,
        claimExpiresAt,
        idempotencyKey: '019a12ea-9518-73cc-9634-58ac624d6eab',
        subject: '00000000-0000-0000-0000-000000000002',
      }),
    ).toEqual({
      claimedAt,
      claimExpiresAt,
      idempotencyKey: '019a12ea-9518-73cc-9634-58ac624d6eab',
      status: 'CLAIMED',
      subject: '00000000-0000-0000-0000-000000000002',
      version: 2,
    })
  })

  it('rejects a second claim in the domain', () => {
    const claimed: InstallationSetupState = {
      claimedAt: new Date('2026-10-23T10:00:00.000Z'),
      claimExpiresAt: new Date('2026-10-23T10:30:00.000Z'),
      idempotencyKey: '019a12ea-9518-73cc-9634-58ac624d6eab',
      status: 'CLAIMED',
      subject: '00000000-0000-0000-0000-000000000002',
      version: 2,
    }

    expect(() =>
      claimInstallationSetup(claimed, {
        claimedAt: new Date('2026-10-23T10:01:00.000Z'),
        claimExpiresAt: new Date('2026-10-23T10:31:00.000Z'),
        idempotencyKey: '019a12ea-9518-73cc-9634-58ac624d6eac',
        subject: '00000000-0000-0000-0000-000000000003',
      }),
    ).toThrow(InstallationSetupTransitionError)
  })
})
