import test from 'node:test';
import assert from 'node:assert/strict';

import { WebhookService } from '../../src/nest/modules/webhook/webhook.service';

test('WebhookService applies provider expiration idempotently', async () => {
  const providerExpiration = new Date('2026-07-09T16:49:46.000Z');
  const subscriber = {
    id: 'subscriber-1',
    userId: 'user-1',
    status: 'not_subscribed',
    expirationDate: new Date('2026-06-15T18:58:07.545Z'),
  };
  const subscriptionUpdates: Record<string, any>[] = [];
  const subscriberUpdates: Record<string, any>[] = [];

  const webhookRepository = {
    async verifyPaypalWebhookSignature() {
      return true;
    },
    async markSubscription(payload: Record<string, any>) {
      subscriptionUpdates.push({ ...payload });
      return {
        subscriptionId: payload.subscriptionId,
        userId: 'user-1',
      };
    },
    async reviewSubscriber() {
      return subscriber;
    },
    async findSubscriberByUserId() {
      return subscriber;
    },
    async updateSubscriber(payload: Record<string, any>) {
      subscriberUpdates.push({ ...payload });
      subscriber.status = payload.status;
      subscriber.expirationDate = payload.expirationDate;
      return subscriber;
    },
  };

  const service = new WebhookService(webhookRepository as any);
  const payload = {
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    resource: {
      id: 'provider-subscription-1',
      billing_info: {
        next_billing_time: providerExpiration.toISOString(),
      },
    },
  };

  await service.handlePaypalWebhook({}, payload);
  await service.handlePaypalWebhook({}, payload);

  assert.equal(subscriptionUpdates.length, 2);
  assert.equal(subscriberUpdates.length, 2);
  assert.equal(subscriberUpdates[0].status, 'ACTIVE');
  assert.equal(
    new Date(subscriberUpdates[0].expirationDate).toISOString(),
    providerExpiration.toISOString(),
  );
  assert.equal(
    new Date(subscriberUpdates[1].expirationDate).toISOString(),
    providerExpiration.toISOString(),
  );
});
