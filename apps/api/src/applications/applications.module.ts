import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module.js'
import { ApplicationAccessController } from './application-access.controller.js'
import { ApplicationAccessService } from './application-access.service.js'
import { ApplicationManagementController } from './application-management.controller.js'
import { ApplicationManagementService } from './application-management.service.js'

@Module({
  controllers: [ApplicationAccessController, ApplicationManagementController],
  imports: [PrismaModule],
  providers: [ApplicationAccessService, ApplicationManagementService],
})
export class ApplicationsModule {}
