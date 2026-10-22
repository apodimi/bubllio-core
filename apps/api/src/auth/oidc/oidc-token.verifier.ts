import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey, type JWTVerifyOptions } from 'jose'

import type { VerifiedSubject } from '../identity.types.js'
import {
  parseAudienceClaim,
  parseOptionalBooleanClaim,
  parseOptionalNumericDateClaim,
  parseOptionalStringClaim,
  parseOrganizationClaim,
  parseRequiredStringClaim,
} from './oidc-claims.parser.js'
import type { OidcConfig } from './oidc.types.js'

/** Verifies cryptographic JWT constraints before exposing a reduced identity. */
export async function verifyAccessToken(
  token: string,
  config: OidcConfig,
  getKey: JWTVerifyGetKey,
): Promise<VerifiedSubject> {
  const options: JWTVerifyOptions = {
    audience: config.audience,
    issuer: config.issuer,
  }
  const { payload } = await jwtVerify(token, getKey, options)

  return {
    audience: parseAudienceClaim(payload.aud),
    authenticatedAt: parseOptionalNumericDateClaim(payload.auth_time, 'auth_time'),
    email: parseOptionalStringClaim(payload.email, 'email'),
    emailVerified: parseOptionalBooleanClaim(payload.email_verified, 'email_verified'),
    issuer: parseRequiredStringClaim(payload.iss, 'iss'),
    organization: parseOrganizationClaim(payload.organization),
    subject: parseRequiredStringClaim(payload.sub, 'sub'),
  }
}

/** Creates one cached remote-key resolver for the lifetime of the AuthService. */
export function createOidcKeyResolver(config: OidcConfig): JWTVerifyGetKey {
  const jwksUrl = config.jwksUrl ?? `${config.issuer}/protocol/openid-connect/certs`
  return createRemoteJWKSet(new URL(jwksUrl))
}
