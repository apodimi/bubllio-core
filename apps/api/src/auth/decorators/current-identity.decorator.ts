import { createParamDecorator, InternalServerErrorException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'

import type { AuthenticatedRequest, VerifiedIdentity } from '../identity.types.js'

/** Returns only the identity already validated by the global authentication guard. */
export const CurrentIdentity = createParamDecorator(
  (_data: unknown, context: ExecutionContext): VerifiedIdentity => {
    const identity = context.switchToHttp().getRequest<AuthenticatedRequest>().identity

    // Reaching a protected controller without an identity is a server wiring bug, not a 401.
    if (!identity) {
      throw new InternalServerErrorException('Authenticated identity is unavailable')
    }

    return identity
  },
)
