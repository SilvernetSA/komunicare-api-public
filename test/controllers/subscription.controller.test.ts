import test from 'node:test';
import assert from 'node:assert/strict';

import { SubscriptionController } from '../../src/nest/modules/subscription/subscription.controller';

test('SubscriptionController delegates cancellation to SubscriptionService', async () => {
  let receivedReq: unknown;
  let receivedSubscriptionId = '';

  const subscriptionService = {
    async cancelSubscription(req: unknown, subscriptionId: string) {
      receivedReq = req;
      receivedSubscriptionId = subscriptionId;
      return {
        id: 'sub-1',
        platform: 'paypal',
        subscriptionId: 'I-PAYPAL-1',
      };
    },
  };

  const controller = new SubscriptionController(subscriptionService as any);

  const req = { auth: { id: 'user-1' } };
  const response = await controller.cancelSubscription(req as any, 'sub-1');

  assert.equal(receivedReq, req);
  assert.equal(receivedSubscriptionId, 'sub-1');
  assert.equal(response.id, 'sub-1');
  assert.equal(response.platform, 'paypal');
});


test('SubscriptionController lists subscriptions using SubscriptionService', async () => {
  const subscriptionService = {
    async listSubscriptions() {
      return {
        suscriptions: [
          {
            id: 'sub-1',
            status: 'ACTIVE',
            platform: 'paypal',
            planId: 'plan-1',
            userId: 'user-1',
            subscriptionId: 'I-PAYPAL-1',
            plan: { id: 'plan-1', name: 'Premium mensual' },
          },
        ],
        count: 1,
      };
    },
  };

  const controller = new SubscriptionController(subscriptionService as any);

  const response = await controller.listSubscriptions({} as any);

  assert.equal(response.count, 1);
  assert.equal(response.suscriptions[0].id, 'sub-1');
  assert.equal((response.suscriptions[0].plan as any).name, 'Premium mensual');
});
