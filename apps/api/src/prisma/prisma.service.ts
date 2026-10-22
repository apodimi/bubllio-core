import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client.js'
import { readDatabaseUrl } from './prisma.config.js'

/** Owns the single Prisma connection pool used by the Core API process. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: readDatabaseUrl(),
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      max: 10,
    })

    super({ adapter })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
