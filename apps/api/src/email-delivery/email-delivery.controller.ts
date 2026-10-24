import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
  UnprocessableEntityException,
  UseFilters,
  UseGuards,
} from '@nestjs/common'

import { Public } from '../auth/decorators/public.decorator.js'
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'
import { SetupAvailabilityGuard } from '../setup/guards/setup-availability.guard.js'
import { SetupSecretGuard } from '../setup/guards/setup-secret.guard.js'
import { SetupProblemFilter } from '../setup/setup-problem.filter.js'
import { EmailDeliveryRepository } from './email-delivery.repository.js'
import { EmailDeliveryService } from './email-delivery.service.js'
import { SetupRateLimitGuard } from './setup-rate-limit.guard.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const MAX_BODY_BYTES = 16_384

@Controller('api/v1/setup/email')
@Public()
@UseFilters(SetupProblemFilter)
export class EmailDeliveryController {
  constructor(
    private readonly repository: EmailDeliveryRepository,
    private readonly service: EmailDeliveryService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  @Get('status')
  @UseGuards(SetupAvailabilityGuard)
  @Header('Cache-Control', 'no-store, max-age=0')
  @Header('Referrer-Policy', 'no-referrer')
  status() {
    return this.repository.status()
  }

  @Post('test')
  @HttpCode(200)
  @UseGuards(SetupAvailabilityGuard, SetupSecretGuard, SetupRateLimitGuard)
  @Header('Cache-Control', 'no-store, max-age=0')
  @Header('Referrer-Policy', 'no-referrer')
  test(
    @Headers('origin') origin: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Headers('content-length') contentLength: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    this.requireMutation(origin, contentType, contentLength, idempotencyKey, body)
    return this.service.test(body, idempotencyKey!)
  }

  @Post('confirm')
  @HttpCode(200)
  @UseGuards(SetupAvailabilityGuard, SetupSecretGuard, SetupRateLimitGuard)
  @Header('Cache-Control', 'no-store, max-age=0')
  @Header('Referrer-Policy', 'no-referrer')
  confirm(
    @Headers('origin') origin: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Headers('content-length') contentLength: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    this.requireMutation(origin, contentType, contentLength, idempotencyKey, body)
    return this.service.confirm(body, idempotencyKey!)
  }

  private requireMutation(
    origin: string | undefined,
    contentType: string | undefined,
    contentLength: string | undefined,
    idempotencyKey: string | undefined,
    body: unknown,
  ): void {
    if (origin !== this.config.webOrigin) throw new NotFoundException('Setup is unavailable')
    const declaredLength = contentLength === undefined ? undefined : Number(contentLength)
    const actualLength = Buffer.byteLength(JSON.stringify(body), 'utf8')
    if (
      !contentType ||
      !/^application\/json(?:\s*;|$)/iu.test(contentType) ||
      !idempotencyKey ||
      !UUID.test(idempotencyKey) ||
      (declaredLength !== undefined &&
        (!Number.isInteger(declaredLength) ||
          declaredLength < 0 ||
          declaredLength > MAX_BODY_BYTES)) ||
      actualLength > MAX_BODY_BYTES
    ) {
      throw new UnprocessableEntityException('Invalid email setup request')
    }
  }
}
