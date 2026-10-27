import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

import type { AuthenticatedRequest, VerifiedSubject } from '../../auth/identity.types.js'
import { KeycloakOrganizationClient } from '../keycloak-organization.client.js'

export const SETUP_AUTH_MAX_AGE_SECONDS = 10 * 60

/** Requires stronger human identity assurance for the first-run setup ceremony. */
@Injectable()
export class SetupSubjectGuard implements CanActivate {
  constructor(private readonly identityDirectory: KeycloakOrganizationClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const nowSeconds = Math.floor(Date.now() / 1000)

    if (!request.identity || !hasRecentAuthentication(request.identity, nowSeconds)) {
      throw new UnauthorizedException('Recent verified authentication is required')
    }

    if (hasVerifiedEmailClaims(request.identity)) return true
    if (await this.identityDirectory.hasVerifiedEmail(request.identity.subject)) return true

    throw new UnauthorizedException('Recent verified authentication is required')
  }
}

function hasRecentAuthentication(subject: VerifiedSubject, nowSeconds: number): boolean {
  const authenticationAge =
    subject.authenticatedAt === undefined ? undefined : nowSeconds - subject.authenticatedAt

  return (
    authenticationAge !== undefined &&
    authenticationAge >= 0 &&
    authenticationAge <= SETUP_AUTH_MAX_AGE_SECONDS
  )
}

function hasVerifiedEmailClaims(subject: VerifiedSubject): boolean {
  return (
    subject.emailVerified === true &&
    typeof subject.email === 'string' &&
    subject.email.trim().length > 0
  )
}
