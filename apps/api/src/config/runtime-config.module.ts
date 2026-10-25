import { Global, Module } from '@nestjs/common'

import { RUNTIME_CONFIG } from './runtime-config.js'
import { parseRuntimeConfig } from './runtime-config.schema.js'

@Global()
@Module({
  exports: [RUNTIME_CONFIG],
  providers: [
    {
      provide: RUNTIME_CONFIG,
      useFactory: () => parseRuntimeConfig(process.env),
    },
  ],
})
export class RuntimeConfigModule {}
