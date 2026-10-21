import type { OidcConfig } from './oidc.types.js'

/** Reads the complete OIDC contract once during application startup. */
export function readOidcConfig(): OidcConfig {
  const issuer = process.env.OIDC_ISSUER
  const audience = process.env.OIDC_AUDIENCE
  const jwksUrl = process.env.OIDC_JWKS_URL

  if (!issuer || !audience) {
    throw new Error('OIDC_ISSUER and OIDC_AUDIENCE must be configured')
  }

  return {
    audience,
    issuer: issuer.replace(/\/$/, ''),
    // Local containers may need an internal JWKS address while validating the public issuer.
    jwksUrl,
  }
}
