import test from 'node:test';
import assert from 'node:assert/strict';

import { SubscriberService } from '../../src/nest/modules/subscriber/subscriber.service';

test('SubscriberService.getSubscriber demotes trial-like active status without paid subscriptions', async () => {
  const subscriber: any = {
    userId: 'user-1',
    status: 'active',
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    toJSON() {
      return {
        userId: this.userId,
        status: this.status,
        expirationDate: this.expirationDate,
      };
    },
  };

  let saveCalls = 0;
  const service = new SubscriberService(
    {
      async getAuthorizedUser() {
        return { id: 'user-1', role: 'user', isAdmin: false };
      },
    } as any,
    {
      async findByUserId() {
        return subscriber;
      },
      async save(doc: any) {
        saveCalls += 1;
        return doc;
      },
      create() {
        throw new Error('create should not be called');
      },
    } as any,
    {
      async findActiveSubscriptionsByUserId(userId: string) {
        assert.equal(userId, 'user-1');
        return [];
      },
    } as any,
  );

  const result = await service.getSubscriber({} as any, 'user-1');

  assert.equal(result.status, 'not_subscribed');
  assert.equal(saveCalls, 1);
});

test('SubscriberService.getSubscriber upgrades stale not_subscribed status when paid subscription exists', async () => {
  const subscriber: any = {
    userId: 'user-1',
    status: 'not_subscribed',
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    toJSON() {
      return {
        userId: this.userId,
        status: this.status,
        expirationDate: this.expirationDate,
      };
    },
  };

  let saveCalls = 0;
  const service = new SubscriberService(
    {
      async getAuthorizedUser() {
        return { id: 'user-1', role: 'user', isAdmin: false };
      },
    } as any,
    {
      async findByUserId() {
        return subscriber;
      },
      async save(doc: any) {
        saveCalls += 1;
        return doc;
      },
      create() {
        throw new Error('create should not be called');
      },
    } as any,
    {
      async findActiveSubscriptionsByUserId(userId: string) {
        assert.equal(userId, 'user-1');
        return [{ id: 'sub-1' }];
      },
    } as any,
  );

  const result = await service.getSubscriber({} as any, 'user-1');

  assert.equal(result.status, 'active');
  assert.equal(saveCalls, 1);
});

test('SubscriberService.getSubscriber preserves cancelled status when cancelledAt exists', async () => {
  const subscriber: any = {
    userId: 'user-1',
    status: 'cancelled',
    cancelledAt: new Date(),
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    toJSON() {
      return {
        userId: this.userId,
        status: this.status,
        expirationDate: this.expirationDate,
      };
    },
  };

  let saveCalls = 0;
  const service = new SubscriberService(
    {
      async getAuthorizedUser() {
        return { id: 'user-1', role: 'user', isAdmin: false };
      },
    } as any,
    {
      async findByUserId() {
        return subscriber;
      },
      async save(doc: any) {
        saveCalls += 1;
        return doc;
      },
      create() {
        throw new Error('create should not be called');
      },
    } as any,
    {
      async findActiveSubscriptionsByUserId() {
        return [];
      },
    } as any,
  );

  const result = await service.getSubscriber({} as any, 'user-1');

  assert.equal(result.status, 'cancelled');
  assert.equal(saveCalls, 0);
});
