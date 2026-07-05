import { Module } from '@nestjs/common';

import { AccountPersistenceService } from './account-persistence.service';
import { AuthUserRepository } from './auth-user.repository';
import { BillingPersistenceService } from './billing-persistence.service';
import { CommunicatorBoardCleanupService } from './communicator-board-cleanup.service';
import { ContentPersistenceService } from './content-persistence.service';
import { LegacyAuthService } from './legacy-auth.service';
import { MailGatewayService } from './mail-gateway.service';
import { MailTemplateService } from './mail-template.service';
import { MediaStorageService } from './media-storage.service';
import { PaymentsGatewayService } from './payments-gateway.service';

@Module({
  providers: [
    LegacyAuthService,
    AuthUserRepository,
    AccountPersistenceService,
    BillingPersistenceService,
    ContentPersistenceService,
    PaymentsGatewayService,
    MailGatewayService,
    MailTemplateService,
    MediaStorageService,
    CommunicatorBoardCleanupService,
  ],
  exports: [
    LegacyAuthService,
    AccountPersistenceService,
    BillingPersistenceService,
    ContentPersistenceService,
    PaymentsGatewayService,
    MailGatewayService,
    MailTemplateService,
    MediaStorageService,
    CommunicatorBoardCleanupService,
  ],
})
export class CommonModule {}
