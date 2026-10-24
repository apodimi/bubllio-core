import { Module } from '@nestjs/common'

import { ApplicationsModule } from './applications/applications.module.js'
import { AuthModule } from './auth/auth.module.js'
import { RuntimeConfigModule } from './config/runtime-config.module.js'
import { EmailDeliveryModule } from './email-delivery/email-delivery.module.js'
import { HealthModule } from './health/health.module.js'
import { InstallationManifestModule } from './installation-manifest/installation-manifest.module.js'
import { SetupModule } from './setup/setup.module.js'

@Module({
  imports: [
    RuntimeConfigModule,
    AuthModule,
    EmailDeliveryModule,
    SetupModule,
    InstallationManifestModule,
    ApplicationsModule,
    HealthModule,
  ],
})
export class AppModule {}
