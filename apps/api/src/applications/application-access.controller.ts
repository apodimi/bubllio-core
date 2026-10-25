import { Controller, Get, Header, Param } from '@nestjs/common'

import { CurrentIdentity } from '../auth/decorators/current-identity.decorator.js'
import type { VerifiedSubject } from '../auth/identity.types.js'
import {
  ApplicationAccessService,
  type WorkspaceApplication,
  type WorkspaceOrganization,
} from './application-access.service.js'

/** Read-only workspace and app-backend access contract. */
@Controller('api/v1')
export class ApplicationAccessController {
  constructor(private readonly access: ApplicationAccessService) {}

  @Get('me/organizations')
  @Header('Cache-Control', 'no-store')
  listOrganizations(
    @CurrentIdentity() identity: VerifiedSubject,
  ): Promise<WorkspaceOrganization[]> {
    return this.access.listOrganizations(identity)
  }

  @Get('organizations/:organizationId/application-catalog')
  @Header('Cache-Control', 'no-store')
  listCatalog(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
  ): Promise<WorkspaceApplication[]> {
    return this.access.listCatalog(identity, organizationId)
  }

  @Get('organizations/:organizationId/applications')
  @Header('Cache-Control', 'no-store')
  listApplications(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
  ): Promise<WorkspaceApplication[]> {
    return this.access.listApplications(identity, organizationId)
  }

  @Get('organizations/:organizationId/applications/:applicationKey/access')
  @Header('Cache-Control', 'no-store')
  async checkAccess(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
    @Param('applicationKey') applicationKey: string,
  ): Promise<{ allowed: boolean }> {
    return { allowed: await this.access.canAccess(identity, organizationId, applicationKey) }
  }
}
