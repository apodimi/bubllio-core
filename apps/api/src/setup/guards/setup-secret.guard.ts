import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common'

import type { AuthenticatedRequest } from '../../auth/identity.types.js'
import { SetupSecretService } from '../setup-secret.service.js'

/** Requires the independent out-of-band proof for installation setup mutations. */
@Injectable()
export class SetupSecretGuard implements CanActivate {
  constructor(private readonly setupSecretService: SetupSecretService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const presentedSecret = request.headers['x-bubllio-setup-secret']

    if (
      typeof presentedSecret !== 'string' ||
      presentedSecret.length > 512 ||
      !this.setupSecretService.matches(presentedSecret)
    ) {
      // Missing, invalid, expired, and disabled setup intentionally look identical.
      throw new NotFoundException('Setup is unavailable')
    }

    return true
  }
}
