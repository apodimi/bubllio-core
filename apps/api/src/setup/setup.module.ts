import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module.js'
import { SetupSecretGuard } from './guards/setup-secret.guard.js'
import { SetupSubjectGuard } from './guards/setup-subject.guard.js'
import { SetupRepository } from './setup.repository.js'
import { SetupSecretService } from './setup-secret.service.js'

@Module({
  exports: [SetupRepository, SetupSecretGuard, SetupSubjectGuard],
  imports: [PrismaModule],
  providers: [SetupRepository, SetupSecretGuard, SetupSecretService, SetupSubjectGuard],
})
export class SetupModule {}
