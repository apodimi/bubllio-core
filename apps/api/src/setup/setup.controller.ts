import {
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Res,
  UnprocessableEntityException,
  UseFilters,
  UseGuards,
} from '@nestjs/common'

import { CurrentIdentity } from '../auth/decorators/current-identity.decorator.js'
import { Public } from '../auth/decorators/public.decorator.js'
import type { VerifiedSubject } from '../auth/identity.types.js'
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'
import { SetupAvailabilityGuard } from './guards/setup-availability.guard.js'
import { SetupSecretGuard } from './guards/setup-secret.guard.js'
import { SetupSubjectGuard } from './guards/setup-subject.guard.js'
import { SetupProblemFilter } from './setup-problem.filter.js'
import { SetupProvisioningService, type SetupOperationView } from './setup-provisioning.service.js'
import { SetupRepository, type PublicSetupStatus } from './setup.repository.js'

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const CLAIM_LIFETIME_MS = 30 * 60 * 1000

interface ClaimResponse {
  status: 'claimed'
}

@Controller('api/v1/setup')
@UseFilters(SetupProblemFilter)
export class SetupController {
  constructor(
    private readonly setupRepository: SetupRepository,
    private readonly provisioning: SetupProvisioningService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  @Get('status')
  @Public()
  @Header('Cache-Control', 'no-store, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('X-Frame-Options', 'DENY')
  @Header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  async getStatus(): Promise<PublicSetupStatus> {
    return this.setupRepository.readPublicStatus()
  }

  @Get('current')
  @UseGuards(SetupAvailabilityGuard)
  @Header('Cache-Control', 'no-store, max-age=0')
  @Header('Referrer-Policy', 'no-referrer')
  current(@CurrentIdentity() identity: VerifiedSubject) {
    return this.provisioning.current(identity)
  }

  @Post('claim')
  @HttpCode(200)
  @UseGuards(SetupAvailabilityGuard, SetupSubjectGuard, SetupSecretGuard)
  @Header('Cache-Control', 'no-store, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('X-Frame-Options', 'DENY')
  @Header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  async claim(
    @CurrentIdentity() identity: VerifiedSubject,
    @Headers('origin') origin: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: { status: (code: number) => void },
  ): Promise<ClaimResponse> {
    if (origin !== this.config.webOrigin) {
      throw new NotFoundException('Setup is unavailable')
    }

    if (!contentType || !/^application\/json(?:\s*;|$)/iu.test(contentType)) {
      throw new UnprocessableEntityException('Invalid setup request')
    }

    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new UnprocessableEntityException('Invalid setup request')
    }

    if (
      body === null ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).length
    ) {
      throw new UnprocessableEntityException('Invalid setup request')
    }

    const claimedAt = new Date()
    const result = await this.setupRepository.claim({
      claimedAt,
      claimExpiresAt: new Date(claimedAt.getTime() + CLAIM_LIFETIME_MS),
      idempotencyKey,
      subject: identity.subject,
    })

    if (result.outcome === 'conflict') {
      throw new ConflictException('Setup claim conflicts with existing state')
    }

    if (result.outcome === 'claimed') {
      response.status(201)
    }

    return { status: 'claimed' }
  }

  @Post('organization')
  @UseGuards(SetupAvailabilityGuard)
  @HttpCode(201)
  @Header('Cache-Control', 'no-store, max-age=0')
  @Header('Referrer-Policy', 'no-referrer')
  async createOrganization(
    @CurrentIdentity() identity: VerifiedSubject,
    @Headers('origin') origin: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: { status: (code: number) => void },
  ): Promise<SetupOperationView> {
    requireSetupMutation(this.config.webOrigin, origin, contentType, idempotencyKey)
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).length !== 1 ||
      typeof Reflect.get(body, 'displayName') !== 'string'
    ) {
      throw new UnprocessableEntityException('Invalid organization request')
    }
    const result = await this.provisioning.start(
      identity,
      Reflect.get(body, 'displayName'),
      idempotencyKey!,
    )
    response.status(result.status === 'succeeded' ? 201 : 202)
    return result
  }

  @Get('operations/:operationId')
  @UseGuards(SetupAvailabilityGuard)
  @Header('Cache-Control', 'no-store, max-age=0')
  @Header('Referrer-Policy', 'no-referrer')
  readOperation(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('operationId') operationId: string,
  ): Promise<SetupOperationView> {
    return this.provisioning.read(identity, operationId)
  }

  @Post('operations/:operationId/retry')
  @HttpCode(202)
  @UseGuards(SetupAvailabilityGuard, SetupSecretGuard)
  @Header('Cache-Control', 'no-store, max-age=0')
  @Header('Referrer-Policy', 'no-referrer')
  retryOperation(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('operationId') operationId: string,
    @Headers('origin') origin: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<SetupOperationView> {
    requireSetupMutation(this.config.webOrigin, origin, contentType, idempotencyKey)
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) {
      throw new UnprocessableEntityException('Invalid retry request')
    }
    return this.provisioning.retry(identity, operationId)
  }
}

function requireSetupMutation(
  expectedOrigin: string,
  origin: string | undefined,
  contentType: string | undefined,
  idempotencyKey: string | undefined,
): void {
  if (origin !== expectedOrigin) {
    throw new NotFoundException('Setup is unavailable')
  }
  if (
    !contentType ||
    !/^application\/json(?:\s*;|$)/iu.test(contentType) ||
    !idempotencyKey ||
    !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)
  ) {
    throw new UnprocessableEntityException('Invalid setup request')
  }
}
