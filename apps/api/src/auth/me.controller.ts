import { Controller, Get } from '@nestjs/common'

import { CurrentIdentity } from './decorators/current-identity.decorator.js'
import type { VerifiedSubject } from './identity.types.js'

@Controller('me')
export class MeController {
  @Get()
  getIdentity(@CurrentIdentity() identity: VerifiedSubject): VerifiedSubject {
    return identity
  }
}
