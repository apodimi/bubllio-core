import { Body, Controller, Get, Header, Param, Post, Put, Delete } from '@nestjs/common'

import { CurrentIdentity } from '../auth/decorators/current-identity.decorator.js'
import type { VerifiedSubject } from '../auth/identity.types.js'
import { MemberAdministrationService } from './member-administration.service.js'
import { MemberInvitationAcceptanceService } from './member-invitation-acceptance.service.js'
import { MemberInvitationLifecycleService } from './member-invitation-lifecycle.service.js'
import { MemberInvitationService } from './member-invitation.service.js'
import { MemberInvitationQueryService } from './member-invitation-query.service.js'
import { parseAccessInput, parseInvitationInput } from './member-input.js'

@Controller('api/v1')
export class MembersController {
  constructor(
    private readonly invitations: MemberInvitationService,
    private readonly invitationQueries: MemberInvitationQueryService,
    private readonly members: MemberAdministrationService,
    private readonly acceptance: MemberInvitationAcceptanceService,
    private readonly lifecycle: MemberInvitationLifecycleService,
  ) {}

  @Get('organizations/:organizationId/invitations')
  @Header('Cache-Control', 'no-store')
  listInvitations(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
  ) {
    return this.invitationQueries.list(identity, organizationId)
  }

  @Post('organizations/:organizationId/invitations')
  @Header('Cache-Control', 'no-store')
  invite(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
    @Body() body: unknown,
  ) {
    return this.invitations.invite(identity, organizationId, parseInvitationInput(body))
  }

  @Post('organizations/:organizationId/invitations/:invitationId/resend')
  @Header('Cache-Control', 'no-store')
  resend(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.lifecycle.resend(identity, organizationId, invitationId)
  }

  @Delete('organizations/:organizationId/invitations/:invitationId')
  @Header('Cache-Control', 'no-store')
  revoke(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.lifecycle.revoke(identity, organizationId, invitationId)
  }

  @Get('invitations/mine')
  @Header('Cache-Control', 'no-store')
  mine(@CurrentIdentity() identity: VerifiedSubject) {
    return this.invitationQueries.mine(identity)
  }

  @Post('invitations/:invitationId/accept')
  @Header('Cache-Control', 'no-store')
  accept(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('invitationId') invitationId: string,
  ) {
    return this.acceptance.accept(identity, invitationId)
  }

  @Get('organizations/:organizationId/members')
  @Header('Cache-Control', 'no-store')
  listMembers(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
  ) {
    return this.members.list(identity, organizationId)
  }

  @Put('organizations/:organizationId/members/:subject/access')
  @Header('Cache-Control', 'no-store')
  updateAccess(
    @CurrentIdentity() identity: VerifiedSubject,
    @Param('organizationId') organizationId: string,
    @Param('subject') subject: string,
    @Body() body: unknown,
  ) {
    return this.members.updateAccess(identity, organizationId, subject, parseAccessInput(body))
  }
}
