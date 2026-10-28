import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module.js'
import { SetupAvailabilityGuard } from '../setup/guards/setup-availability.guard.js'
import { SetupSecretGuard } from '../setup/guards/setup-secret.guard.js'
import { SetupSecretService } from '../setup/setup-secret.service.js'
import { EmailDeliveryController } from './email-delivery.controller.js'
import { EmailDeliveryRepository } from './email-delivery.repository.js'
import { EmailDeliveryService } from './email-delivery.service.js'
import { IdentitySetupAgentClient } from './identity-setup-agent.client.js'
import { SetupRateLimitGuard } from './setup-rate-limit.guard.js'

@Module({
  controllers: [EmailDeliveryController],
  exports: [EmailDeliveryRepository, IdentitySetupAgentClient],
  imports: [PrismaModule],
  providers: [
    EmailDeliveryRepository,
    EmailDeliveryService,
    IdentitySetupAgentClient,
    SetupAvailabilityGuard,
    SetupRateLimitGuard,
    SetupSecretGuard,
    SetupSecretService,
  ],
})
export class EmailDeliveryModule {}
