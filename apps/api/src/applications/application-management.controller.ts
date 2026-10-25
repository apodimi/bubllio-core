import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Header,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common'

import { CurrentIdentity } from '../auth/decorators/current-identity.decorator.js'
import type { VerifiedSubject } from '../auth/identity.types.js'
import {
  ApplicationManagementService,
  type RegisterApplicationInput,
} from './application-management.service.js'

/** Core owns catalog and grant mutations; apps only consume the resulting decision. */
@Controller('api/v1')
export class ApplicationManagementController {
  constructor(private readonly management: ApplicationManagementService) {}

  @Post('applications')
  @Header('Cache-Control', 'no-store')
  register(
    @CurrentIdentity() identity: VerifiedSubject,
    @Body() body: unknown,
  ): Promise<RegisterApplicationInput> {
    return this.management.register(identity, parseRegistration(body))
  }

  @Put('organizations/:organizationId/applications/:applicationKey')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async enable(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
    @Param('applicationKey') applicationKey: string,
  ): Promise<{ enabled: true }> {
    await this.management.enable(identity, organizationId, applicationKey)
    return { enabled: true }
  }

  @Delete('organizations/:organizationId/applications/:applicationKey')
  @HttpCode(204)
  async disable(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
    @Param('applicationKey') applicationKey: string,
  ): Promise<void> {
    await this.management.disable(identity, organizationId, applicationKey)
  }

  @Put('organizations/:organizationId/members/:subject/applications/:applicationKey')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async grant(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
    @Param('subject') subject: string,
    @Param('applicationKey') applicationKey: string,
  ): Promise<{ active: true }> {
    await this.management.grant(identity, organizationId, subject, applicationKey)
    return { active: true }
  }

  @Delete('organizations/:organizationId/members/:subject/applications/:applicationKey')
  @HttpCode(204)
  async revoke(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
    @Param('subject') subject: string,
    @Param('applicationKey') applicationKey: string,
  ): Promise<void> {
    await this.management.revoke(identity, organizationId, subject, applicationKey)
  }
}

function parseRegistration(body: unknown): RegisterApplicationInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Invalid application registration')
  }
  const record = body as Record<string, unknown>
  const expectedKeys = ['key', 'displayName', 'launchUrl', 'audience']
  if (
    Object.keys(record).length !== expectedKeys.length ||
    !expectedKeys.every((key) => typeof record[key] === 'string')
  ) {
    throw new BadRequestException('Invalid application registration')
  }
  return record as unknown as RegisterApplicationInput
}
