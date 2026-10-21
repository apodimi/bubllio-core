import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'

import { AppModule } from './app.module.js'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  )
  const port = Number.parseInt(process.env.PORT ?? '3100', 10)

  // Browser clients may call the API only from the explicitly configured UI.
  // Keeping this as one exact origin avoids accidentally allowing arbitrary sites.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5174',
    methods: ['GET'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  })

  await app.listen(port, '0.0.0.0')
}

void bootstrap()
