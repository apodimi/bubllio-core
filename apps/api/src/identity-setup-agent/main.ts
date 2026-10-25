import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import {
  IDENTITY_SETUP_AGENT_CONFIG,
  type IdentitySetupAgentConfig,
} from './identity-setup-agent.config.js'
import { IdentitySetupAgentModule } from './identity-setup-agent.module.js'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    IdentitySetupAgentModule,
    new FastifyAdapter({ logger: false, bodyLimit: 16_384 }),
  )
  const config = app.get<IdentitySetupAgentConfig>(IDENTITY_SETUP_AGENT_CONFIG)
  await app.listen(config.port, '0.0.0.0')
}
void bootstrap()
