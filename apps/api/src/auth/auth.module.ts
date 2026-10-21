import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'

import { AuthService } from './auth.service.js'
import { AuthenticationGuard } from './guards/authentication.guard.js'
import { MeController } from './me.controller.js'

@Module({
  controllers: [MeController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
})
export class AuthModule {}
