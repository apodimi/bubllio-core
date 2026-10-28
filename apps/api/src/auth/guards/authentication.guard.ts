import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { AuthService } from '../auth.service.js'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js'
import type { AuthenticatedRequest } from '../identity.types.js'

/** Protects every HTTP route unless that route explicitly opts out with @Public(). */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticationGuard.name)

  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.headers.authorization

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required')
    }

    try {
      request.identity = await this.authService.verify(authorization.slice('Bearer '.length))
      return true
    } catch (error: unknown) {
      // Preserve useful security telemetry without logging the token or its claims.
      const reason = tokenRejectionReason(error)
      this.logger.warn(`Rejected bearer token (${reason})`)
      throw new UnauthorizedException('Bearer token is invalid')
    }
  }
}

function tokenRejectionReason(error: unknown): string {
  if (!(error instanceof Error)) return 'UnknownError'
  // The claim parsers use fixed messages. Record only the claim name, never a
  // claim value or a third-party error message that might contain token data.
  const invalidClaim =
    /^Token claim '(aud|iss|sub|auth_time|email|email_verified|organization)'/u.exec(error.message)
  return invalidClaim ? `InvalidClaim:${invalidClaim[1]}` : error.name
}
