import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientSession } from 'mongoose';

import { BillingPersistenceService } from '../../../common/billing-persistence.service';
import { SubscriptionModel } from '../models/subscription.model';
import { SubscriptionRepository } from '../subscription.repository';

@Injectable()
export class SubscriptionPersistenceService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly billingPersistenceService: BillingPersistenceService,
  ) {}

  async createSubscriptionRecord(
    payload: Record<string, unknown>,
  ): Promise<SubscriptionModel> {
    const subscription = this.subscriptionRepository.create(payload);
    const saved = await this.subscriptionRepository.save(subscription);
    return typeof saved.toJSON === 'function'
      ? (saved.toJSON() as SubscriptionModel)
      : (saved as SubscriptionModel);
  }

  async getSubscriptionDocumentOrFail(subscriptionId: string): Promise<any> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException(
        `Subscription does not exist. Subscription Id: ${subscriptionId}`,
      );
    }
    return subscription;
  }

  toSubscriptionModel(subscription: any): SubscriptionModel {
    return typeof subscription.toJSON === 'function'
      ? (subscription.toJSON() as SubscriptionModel)
      : (subscription as SubscriptionModel);
  }

  async syncSubscriberStatus(
    userId: string,
    subscriptionStatus: string,
    expirationDate: Date,
    session?: ClientSession,
  ): Promise<void> {
    let subscriber =
      await this.billingPersistenceService.findSubscriberByUserId(userId);

    if (!subscriber) {
      subscriber = this.billingPersistenceService.createSubscriber({
        userId,
        status: 'not_subscribed',
      });
    }

    if (subscriptionStatus === 'ACTIVE') {
      subscriber.status = 'active';
      subscriber.expirationDate = expirationDate;
      if ((subscriber as any).cancelledAt) {
        (subscriber as any).cancelledAt = undefined;
      }
    } else if (subscriptionStatus === 'CANCELLED') {
      subscriber.status = 'cancelled';
      if (!(subscriber as any).cancelledAt) {
        (subscriber as any).cancelledAt = new Date();
      }
    } else if (subscriptionStatus === 'SUSPENDED') {
      subscriber.status = 'suspended';
    } else {
      subscriber.status = 'not_subscribed';
    }

    await this.billingPersistenceService.saveSubscriber(subscriber, session);
  }
}
