import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { WebhookController } from './webhook.controller';
import { WebhookRepository } from './webhook.repository';
import { WebhookService } from './webhook.service';

@Module({
  imports: [CommonModule],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookRepository],
})
export class WebhookModule {}
