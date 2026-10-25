import { Controller, Get, Header, Res } from '@nestjs/common'

import { Public } from '../auth/decorators/public.decorator.js'
import { HealthService, type SystemPreflight, type SystemReadiness } from './health.service.js'

@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Deprecated compatibility alias for existing local container checks. */
  @Get('health')
  @Public()
  getLegacyHealth(): { status: 'ok' } {
    return { status: 'ok' }
  }

  @Get('health/live')
  @Public()
  getLiveness(): { status: 'ok' } {
    return { status: 'ok' }
  }

  @Get('health/ready')
  @Public()
  @Header('Cache-Control', 'no-store')
  async getReadiness(
    @Res({ passthrough: true }) response: { status: (code: number) => void },
  ): Promise<SystemReadiness> {
    const result = await this.health.readiness()
    if (result.status !== 'ready') response.status(503)
    return result
  }

  @Get('api/v1/system/preflight')
  @Public()
  @Header('Cache-Control', 'no-store')
  getPreflight(): Promise<SystemPreflight> {
    return this.health.preflight()
  }
}
