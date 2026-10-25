import { Module } from '@nestjs/common'
import { AgentAuthGuard } from './agent-auth.guard.js'
import { EmailSetupAgentService } from './email-setup-agent.service.js'
import {
  IDENTITY_SETUP_AGENT_CONFIG,
  loadIdentitySetupAgentConfig,
} from './identity-setup-agent.config.js'
import { IdentitySetupAgentController } from './identity-setup-agent.controller.js'
import { KeycloakEmailSetupClient } from './keycloak-email-setup.client.js'

@Module({
  controllers: [IdentitySetupAgentController],
  providers: [
    AgentAuthGuard,
    EmailSetupAgentService,
    KeycloakEmailSetupClient,
    {
      provide: IDENTITY_SETUP_AGENT_CONFIG,
      useFactory: loadIdentitySetupAgentConfig,
    },
  ],
})
export class IdentitySetupAgentModule {}
