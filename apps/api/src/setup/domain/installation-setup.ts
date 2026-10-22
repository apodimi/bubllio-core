export type InstallationSetupState =
  | {
      status: 'NOT_STARTED'
      version: number
    }
  | {
      claimedAt: Date
      claimExpiresAt: Date
      idempotencyKey: string
      status: 'CLAIMED'
      subject: string
      version: number
    }

export interface ClaimInstallationSetupInput {
  claimedAt: Date
  claimExpiresAt: Date
  idempotencyKey: string
  subject: string
}

export class InstallationSetupTransitionError extends Error {
  constructor(currentStatus: InstallationSetupState['status']) {
    super(`Installation setup cannot be claimed from ${currentStatus}`)
    this.name = 'InstallationSetupTransitionError'
  }
}

/** Produces the next state; persistence still uses compare-and-set to win concurrent claims. */
export function claimInstallationSetup(
  current: InstallationSetupState,
  input: ClaimInstallationSetupInput,
): InstallationSetupState {
  if (current.status !== 'NOT_STARTED') {
    throw new InstallationSetupTransitionError(current.status)
  }

  return {
    claimedAt: input.claimedAt,
    claimExpiresAt: input.claimExpiresAt,
    idempotencyKey: input.idempotencyKey,
    status: 'CLAIMED',
    subject: input.subject,
    version: current.version + 1,
  }
}
