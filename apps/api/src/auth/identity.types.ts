export interface OrganizationClaim {
  [alias: string]: {
    id: string
    [attribute: string]: unknown
  }
}

/** Authenticated OIDC subject; organization context may be empty before first-run setup. */
export interface VerifiedSubject {
  audience: string[]
  authenticatedAt: number | undefined
  email: string | undefined
  emailVerified: boolean | undefined
  issuer: string
  organization: OrganizationClaim
  subject: string
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string
    'x-bubllio-setup-secret'?: string
  }
  identity?: VerifiedSubject
  params?: Record<string, string | undefined>
}
