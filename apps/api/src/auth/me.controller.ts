import { Controller, Get } from '@nestjs/common'

import { CurrentIdentity } from './decorators/current-identity.decorator.js'
import type { VerifiedIdentity } from './identity.types.js'

@Controller('me')
export class MeController {
  @Get()
  getIdentity(@CurrentIdentity() identity: VerifiedIdentity): VerifiedIdentity {
    return identity
  }
}
