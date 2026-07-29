import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { PlanModule } from '../plan/plan.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionService } from './subscription.service';
import { MercadopagoSubscriptionService } from './services/mercadopago-subscription.service';
import { PaypalSubscriptionService } from './services/paypal-subscription.service';
import { SubscriptionPersistenceService } from './services/subscription-persistence.service';

@Module({
  imports: [CommonModule, PlanModule],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    SubscriptionRepository,
    PaypalSubscriptionService,
    MercadopagoSubscriptionService,
    SubscriptionPersistenceService,
  ],
})
export class SubscriptionModule {}
