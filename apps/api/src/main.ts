import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'

import { AppModule } from './app.module.js'
import { RUNTIME_CONFIG, type RuntimeConfig } from './config/runtime-config.js'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 16_384 }),
  )
  const config = app.get<RuntimeConfig>(RUNTIME_CONFIG)

  // Browser clients may call the API only from the explicitly configured UI.
  // Keeping this as one exact origin avoids accidentally allowing arbitrary sites.
  app.enableCors({
    origin: config.webOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Bubllio-Setup-Secret'],
  })

  await app.listen(config.port, '0.0.0.0')
}

void bootstrap()
