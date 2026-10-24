import { Module } from '@nestjs/common'

import { InstallationManifestModule } from '../installation-manifest/installation-manifest.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { HealthController } from './health.controller.js'
import { HealthService } from './health.service.js'

@Module({
  controllers: [HealthController],
  imports: [PrismaModule, InstallationManifestModule],
  providers: [HealthService],
})
export class HealthModule {}
