import { Module } from '@nestjs/common'

import { ApplicationsModule } from './applications/applications.module.js'
import { AuthModule } from './auth/auth.module.js'
import { HealthController } from './health.controller.js'
import { SetupModule } from './setup/setup.module.js'

@Module({
  controllers: [HealthController],
  imports: [AuthModule, SetupModule, ApplicationsModule],
})
export class AppModule {}
