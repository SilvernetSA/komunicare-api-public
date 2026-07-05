import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { SubscriberController } from './subscriber.controller';
import { SubscriberRepository } from './subscriber.repository';
import { SubscriberService } from './subscriber.service';

@Module({
  imports: [CommonModule],
  controllers: [SubscriberController],
  providers: [SubscriberService, SubscriberRepository],
})
export class SubscriberModule {}
