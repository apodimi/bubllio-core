import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module.js'
import { InstallationManifestController } from './installation-manifest.controller.js'
import { InstallationManifestRepository } from './installation-manifest.repository.js'
import { InstallationManifestService } from './installation-manifest.service.js'

@Module({
  controllers: [InstallationManifestController],
  exports: [InstallationManifestService],
  imports: [PrismaModule],
  providers: [InstallationManifestRepository, InstallationManifestService],
})
export class InstallationManifestModule {}
