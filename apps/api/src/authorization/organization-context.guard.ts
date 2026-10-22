import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import type { AuthenticatedRequest } from '../auth/identity.types.js'
import { hasOrganizationContext } from './organization-context.js'
import { ORGANIZATION_PARAM_KEY } from './organization-context.metadata.js'

/** Enforces exact token membership for routes marked with @RequireOrganizationContext(). */
@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const organizationParam = this.reflector.getAllAndOverride<string>(ORGANIZATION_PARAM_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!organizationParam) {
      throw new InternalServerErrorException('Organization route parameter is not configured')
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (!request.identity) {
      throw new UnauthorizedException('Authenticated subject is unavailable')
    }

    const organizationId = request.params?.[organizationParam]
    if (!organizationId || !hasOrganizationContext(request.identity, organizationId)) {
      throw new ForbiddenException('Organization context is required')
    }

    return true
  }
}
