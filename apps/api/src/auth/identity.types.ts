export interface OrganizationClaim {
  [alias: string]: {
    id?: string
    [attribute: string]: unknown
  }
}

/** Minimal trusted identity exposed to application controllers. */
export interface VerifiedIdentity {
  audience: string[]
  issuer: string
  organization: OrganizationClaim
  subject: string
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string
  }
  identity?: VerifiedIdentity
}
