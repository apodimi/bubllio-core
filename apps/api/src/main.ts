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

  await app.listen(port, '0.0.0.0')
}

void bootstrap()
