import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { RUNTIME_CONFIG, type RuntimeConfig } from '../../config/runtime-config.js'

/** Exposes setup only for an explicitly enabled installation claim. */
@Injectable()
export class SetupAvailabilityGuard implements CanActivate {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  canActivate(_context: ExecutionContext): boolean {
    if (!this.config.setup.claimEnabled) {
      throw new NotFoundException('Setup is unavailable')
    }

    // Development setup stays restricted to the explicit loopback rehearsal.
    // Production endpoints are validated centrally before the application starts.
    if (this.config.environment !== 'production') {
      const webOrigin = this.config.webOrigin
      const issuer = this.config.oidc.issuer
      if (
        !this.config.setup.localRehearsal ||
        !/^http:\/\/127\.0\.0\.1:\d+$/u.test(webOrigin) ||
        !/^http:\/\/127\.0\.0\.1:\d+\/realms\/bubllio$/u.test(issuer)
      ) {
        throw new NotFoundException('Setup is unavailable')
      }
    }
    return true
  }
}
