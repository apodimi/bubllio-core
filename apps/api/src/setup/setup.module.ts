import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module.js'
import { EmailDeliveryModule } from '../email-delivery/email-delivery.module.js'
import { SetupAvailabilityGuard } from './guards/setup-availability.guard.js'
import { SetupSecretGuard } from './guards/setup-secret.guard.js'
import { SetupSubjectGuard } from './guards/setup-subject.guard.js'
import { SetupRepository } from './setup.repository.js'
import { SetupSecretService } from './setup-secret.service.js'
import { SetupController } from './setup.controller.js'
import { KeycloakOrganizationClient } from './keycloak-organization.client.js'
import { SetupProvisioningService } from './setup-provisioning.service.js'

@Module({
  controllers: [SetupController],
  exports: [SetupRepository, SetupSecretGuard, SetupSubjectGuard],
  imports: [PrismaModule, EmailDeliveryModule],
  providers: [
    KeycloakOrganizationClient,
    SetupAvailabilityGuard,
    SetupProvisioningService,
    SetupRepository,
    SetupSecretGuard,
    SetupSecretService,
    SetupSubjectGuard,
  ],
})
export class SetupModule {}
