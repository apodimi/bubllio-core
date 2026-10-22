import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

import type { AuthenticatedRequest, VerifiedSubject } from '../../auth/identity.types.js'

export const SETUP_AUTH_MAX_AGE_SECONDS = 10 * 60

/** Requires stronger human identity assurance for the first-run setup ceremony. */
@Injectable()
export class SetupSubjectGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const nowSeconds = Math.floor(Date.now() / 1000)

    if (!request.identity || !isEligibleSetupSubject(request.identity, nowSeconds)) {
      throw new UnauthorizedException('Recent verified authentication is required')
    }

    return true
  }
}

function isEligibleSetupSubject(subject: VerifiedSubject, nowSeconds: number): boolean {
  const authenticationAge =
    subject.authenticatedAt === undefined ? undefined : nowSeconds - subject.authenticatedAt

  return (
    subject.emailVerified === true &&
    typeof subject.email === 'string' &&
    subject.email.trim().length > 0 &&
    authenticationAge !== undefined &&
    authenticationAge >= 0 &&
    authenticationAge <= SETUP_AUTH_MAX_AGE_SECONDS
  )
}
