import { Injectable } from '@nestjs/common';

import { BillingPersistenceService } from '../../common/billing-persistence.service';

@Injectable()
export class SubscriberRepository {
  constructor(
    private readonly billingPersistence: BillingPersistenceService,
  ) {}

  async findAll(
    filter: Record<string, unknown> = {},
    skip = 0,
    limit = 50,
  ): Promise<{ data: any[]; total: number }> {
    return this.billingPersistence.findAllSubscribers(filter, skip, limit);
  }

  async findByUserId(userId: string): Promise<any | null> {
    return this.billingPersistence.findSubscriberByUserId(userId);
  }

  create(payload: Record<string, unknown>): any {
    return this.billingPersistence.createSubscriber(payload);
  }

  async save(subscriber: any): Promise<any> {
    return this.billingPersistence.saveSubscriber(subscriber);
  }
}
