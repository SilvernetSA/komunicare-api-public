import { Injectable } from '@nestjs/common';

import { BillingPersistenceService } from '../../common/billing-persistence.service';
import { PaymentsGatewayService } from '../../common/payments-gateway.service';

@Injectable()
export class WebhookRepository {
  constructor(
    private readonly billingPersistence: BillingPersistenceService,
    private readonly paymentsGateway: PaymentsGatewayService,
  ) {}

  async verifyPaypalWebhookSignature(
    headers: Record<string, string>,
    payload: any,
  ): Promise<boolean> {
    return this.paymentsGateway.verifyPaypalWebhookSignature(headers, payload);
  }

  async getMercadoPagoPreApproval(id: string): Promise<any> {
    return this.paymentsGateway.getMercadoPagoPreApproval(id);
  }

  async markSubscription(payload: Record<string, unknown>): Promise<any> {
    const subscriptionId =
      typeof payload.subscriptionId === 'string' ? payload.subscriptionId : '';
    if (!subscriptionId) {
      return null;
    }

    const subscription =
      await this.billingPersistence.findSubscriptionByProviderId(subscriptionId);

    if (!subscription) {
      return null;
    }

    if (typeof payload.status === 'string') {
      subscription.status = payload.status;
    }

    if (payload.expirationDate) {
      subscription.expirationDate = payload.expirationDate;
    }

    await this.billingPersistence.saveSubscription(subscription);
    return subscription;
  }

  async reviewSubscriber(userId: string): Promise<any> {
    let subscriber = await this.billingPersistence.findSubscriberByUserId(userId);

    if (!subscriber) {
      subscriber = this.billingPersistence.createSubscriber({
        userId,
        status: 'NOT_SUBSCRIBED',
      });
      await this.billingPersistence.saveSubscriber(subscriber);
    }

    if (subscriber.expirationDate) {
      const now = new Date();
      const endDate = new Date(subscriber.expirationDate);

      subscriber.status = endDate > now ? 'ACTIVE' : 'NOT_SUBSCRIBED';
      await this.billingPersistence.saveSubscriber(subscriber);
    }

    return subscriber;
  }

  async findSubscriberByUserId(userId: string): Promise<any> {
    return this.billingPersistence.findSubscriberByUserId(userId);
  }

  async updateSubscriber(payload: Record<string, unknown>): Promise<any> {
    const id = typeof payload.id === 'string' ? payload.id : '';
    if (!id) {
      return null;
    }

    const subscriber = await this.billingPersistence.findSubscriberById(id);
    if (!subscriber) {
      return null;
    }

    if (typeof payload.status === 'string') {
      subscriber.status = payload.status;
    }

    if (payload.expirationDate) {
      subscriber.expirationDate = payload.expirationDate;
    }

    await this.billingPersistence.saveSubscriber(subscriber);
    return subscriber;
  }

  async findPlanByPlanId(planId: string): Promise<any> {
    return this.billingPersistence.findPlanByPlanId(planId);
  }
}
