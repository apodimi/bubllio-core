import {
  Body,
  Controller,
  HttpCode,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common'
import { AgentAuthGuard } from './agent-auth.guard.js'
import { AgentOperationError, EmailSetupAgentService } from './email-setup-agent.service.js'

const HEX = /^[a-f0-9]{64}$/u

@Controller('internal/v1/email')
@UseGuards(AgentAuthGuard)
export class IdentitySetupAgentController {
  constructor(private readonly service: EmailSetupAgentService) {}

  @Post('test')
  @HttpCode(204)
  async test(@Body() body: unknown): Promise<void> {
    if (
      !record(body) ||
      typeof body.confirmationCode !== 'string' ||
      !/^\d{6}$/u.test(body.confirmationCode) ||
      typeof body.fingerprint !== 'string' ||
      !HEX.test(body.fingerprint)
    )
      throw new UnprocessableEntityException({ code: 'EMAIL_DELIVERY_REJECTED' })
    const { confirmationCode, fingerprint, ...smtp } = body
    try {
      await this.service.test(smtp, confirmationCode, fingerprint)
    } catch (error) {
      throw new UnprocessableEntityException({
        code: error instanceof AgentOperationError ? error.safeCode : 'IDENTITY_ACTIVATION_FAILED',
      })
    }
  }

  @Post('finalize')
  @HttpCode(204)
  async finalize(@Body() body: unknown): Promise<void> {
    if (
      !record(body) ||
      Object.keys(body).length !== 1 ||
      typeof body.fingerprint !== 'string' ||
      !HEX.test(body.fingerprint)
    )
      throw new UnprocessableEntityException({ code: 'IDENTITY_ACTIVATION_FAILED' })
    try {
      await this.service.finalize(body.fingerprint)
    } catch {
      throw new UnprocessableEntityException({ code: 'IDENTITY_ACTIVATION_FAILED' })
    }
  }

  @Post('close-registration')
  @HttpCode(204)
  async closeRegistration(@Body() body: unknown): Promise<void> {
    if (!record(body) || Object.keys(body).length !== 0)
      throw new UnprocessableEntityException({ code: 'IDENTITY_ACTIVATION_FAILED' })
    try {
      await this.service.closeRegistration()
    } catch {
      throw new UnprocessableEntityException({ code: 'IDENTITY_ACTIVATION_FAILED' })
    }
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
