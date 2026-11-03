import { Module } from '@nestjs/common'

import { ApplicationsModule } from '../applications/applications.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { KeycloakInvitationClient } from './keycloak-invitation.client.js'
import { MemberAdministrationService } from './member-administration.service.js'
import { MemberInvitationAcceptanceService } from './member-invitation-acceptance.service.js'
import { MemberInvitationLifecycleService } from './member-invitation-lifecycle.service.js'
import { MemberInvitationService } from './member-invitation.service.js'
import { MemberInvitationQueryService } from './member-invitation-query.service.js'
import { MembersController } from './members.controller.js'

@Module({
  controllers: [MembersController],
  imports: [ApplicationsModule, PrismaModule],
  providers: [
    KeycloakInvitationClient,
    MemberAdministrationService,
    MemberInvitationService,
    MemberInvitationLifecycleService,
    MemberInvitationQueryService,
    MemberInvitationAcceptanceService,
  ],
})
export class MembersModule {}
