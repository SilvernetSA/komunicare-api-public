import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { PlanModule } from '../plan/plan.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [CommonModule, PlanModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionRepository],
})
export class SubscriptionModule {}
