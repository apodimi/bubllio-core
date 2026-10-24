import { timingSafeEqual } from 'node:crypto'
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  IDENTITY_SETUP_AGENT_CONFIG,
  type IdentitySetupAgentConfig,
} from './identity-setup-agent.config.js'

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(
    @Inject(IDENTITY_SETUP_AGENT_CONFIG) private readonly config: IdentitySetupAgentConfig,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    const authorization = context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>()
      .headers.authorization
    const presented =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : ''
    const left = Buffer.from(presented)
    const right = Buffer.from(this.config.token)
    if (left.length !== right.length || !timingSafeEqual(left, right)) throw new NotFoundException()
    return true
  }
}
