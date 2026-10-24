import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common'

/** Keeps every setup mutation and private read inside the isolated rehearsal. */
@Injectable()
export class SetupAvailabilityGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5174'
    const issuer = process.env.OIDC_ISSUER ?? ''
    if (
      process.env.CORE_SETUP_LOCAL_REHEARSAL !== 'true' ||
      process.env.CORE_SETUP_CLAIM_ENABLED !== 'true' ||
      !/^http:\/\/127\.0\.0\.1:\d+$/u.test(webOrigin) ||
      !/^http:\/\/127\.0\.0\.1:\d+\/realms\/bubllio$/u.test(issuer)
    ) {
      throw new NotFoundException('Setup is unavailable')
    }
    return true
  }
}
