import test from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';

import { SubscriptionService } from '../../src/nest/modules/subscription/subscription.service';

test('SubscriptionService keeps the PayPal checkout flow unchanged', async () => {
  let savedSubscription: Record<string, unknown> | undefined;
  const service = new SubscriptionService(
    {
      async getAuthorizedUser() {
        return { id: 'user-1', email: 'buyer@example.com' };
      },
    } as any,
    {
      async findActiveByUserId() {
        return [];
      },
      async createPaypalSubscription(payload: Record<string, any>) {
        assert.equal(payload.plan_id, 'paypal-plan-1');
        assert.equal(payload.subscriber.email_address, 'buyer@example.com');
        assert.equal(
          payload.application_context.return_url,
          `${process.env.KOMUNICARE_URL}/settings/subscription`,
        );
        return {
          id: 'I-PAYPAL-1',
          links: [{ href: 'https://paypal.test/checkout/I-PAYPAL-1' }],
        };
      },
      create(payload: Record<string, unknown>) {
        return { ...payload };
      },
      async save(subscription: Record<string, unknown>) {
        savedSubscription = subscription;
        return subscription;
      },
    } as any,
    {
      async findByPlanId(planId: string) {
        assert.equal(planId, 'paypal-plan-1');
        return { id: 'paypal-plan-document-1' };
      },
    } as any,
    {} as any,
  );

  const response = await service.createProviderSubscription({} as any, {
    provider: 'paypal',
    planId: 'paypal-plan-1',
    email: 'ignored@example.com',
  });

  assert.equal(response.link, 'https://paypal.test/checkout/I-PAYPAL-1');
  assert.deepEqual(savedSubscription, {
    status: 'APPROVAL_PENDING',
    platform: 'paypal',
    subscriptionId: 'I-PAYPAL-1',
    planId: 'paypal-plan-document-1',
    userId: 'user-1',
  });
});

test('SubscriptionService confirms an active PayPal subscription', async () => {
  let savedSubscription: Record<string, any> | undefined;
  let savedSubscriber: Record<string, any> | undefined;
  const nextBillingTime = '2026-07-10T12:00:00.000Z';
  const subscription = {
    id: 'subscription-document-1',
    userId: 'user-1',
    planId: 'paypal-plan-document-1',
    platform: 'paypal',
    subscriptionId: 'I-PAYPAL-1',
    status: 'APPROVAL_PENDING',
  };

  const service = new SubscriptionService(
    {
      async getAuthorizedUser() {
        return { id: 'user-1', email: 'buyer@example.com' };
      },
      assertSameUserIdOrAdmin(
        requester: { id: string },
        subscriptionUserId: string,
      ) {
        assert.equal(requester.id, subscriptionUserId);
      },
    } as any,
    {
      async findByProviderSubscriptionId(subscriptionId: string) {
        assert.equal(subscriptionId, 'I-PAYPAL-1');
        return subscription;
      },
      async getPaypalSubscription(subscriptionId: string) {
        assert.equal(subscriptionId, 'I-PAYPAL-1');
        return {
          id: subscriptionId,
          status: 'ACTIVE',
          billing_info: { next_billing_time: nextBillingTime },
        };
      },
      async save(value: Record<string, any>) {
        savedSubscription = value;
        return value;
      },
    } as any,
    {} as any,
    {
      async findSubscriberByUserId(userId: string) {
        assert.equal(userId, 'user-1');
        return null;
      },
      createSubscriber(payload: Record<string, unknown>) {
        return { ...payload };
      },
      async saveSubscriber(value: Record<string, any>) {
        savedSubscriber = value;
        return value;
      },
    } as any,
  );

  const response = await service.confirmPaypalSubscription(
    {} as any,
    'I-PAYPAL-1',
  );

  assert.equal(response.status, 'ACTIVE');
  assert.equal(
    new Date(savedSubscription?.expirationDate).toISOString(),
    nextBillingTime,
  );
  assert.equal(savedSubscriber?.status, 'active');
  assert.equal(
    new Date(savedSubscriber?.expirationDate).toISOString(),
    nextBillingTime,
  );
});

test('SubscriptionService creates an authorized Mercado Pago subscription with the card token', async () => {
  const originalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const originalHostedTestMode = process.env.MERCADOPAGO_HOSTED_TEST_MODE;
  const originalTestMode = process.env.MERCADOPAGO_TEST_MODE;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-access-token';
  process.env.MERCADOPAGO_HOSTED_TEST_MODE = 'false';
  process.env.MERCADOPAGO_TEST_MODE = 'false';

  const legacyAuthService = {
    async getAuthorizedUser() {
      return { id: 'user-1', email: 'seller@example.com' };
    },
  };

  let receivedCardToken = '';
  let savedSubscription: Record<string, any> | undefined;
  let savedSubscriber: Record<string, any> | undefined;
  const subscriptionRepository = {
    async findActiveByUserId() {
      return [];
    },
    async getMercadoPagoPlan(planId: string) {
      assert.equal(planId, 'mp-plan-1');
      return { id: planId };
    },
    async createMercadoPagoSubscription(
      email: string,
      planId: string,
      cardTokenId: string,
    ) {
      assert.equal(email, 'seller@example.com');
      assert.equal(planId, 'mp-plan-1');
      receivedCardToken = cardTokenId;
      return {
        id: 'mp-subscription-1',
        status: 'authorized',
        next_payment_date: '2020-01-01T00:00:00.000Z',
      };
    },
    create(payload: Record<string, unknown>) {
      return { ...payload };
    },
    async save(subscription: Record<string, any>) {
      savedSubscription = subscription;
      return subscription;
    },
  };

  const planRepository = {
    async findByPlanId(planId: string) {
      assert.equal(planId, 'mp-plan-1');
      return {
        id: 'plan-document-1',
        interval: 'MONTH',
        intervalCount: 1,
      };
    },
  };

  const billingPersistenceService = {
    async findSubscriberByUserId() {
      return null;
    },
    createSubscriber(payload: Record<string, unknown>) {
      return { ...payload };
    },
    async saveSubscriber(subscriber: Record<string, any>) {
      savedSubscriber = subscriber;
      return subscriber;
    },
  };

  const beforeCreation = Date.now();
  const service = new SubscriptionService(
    legacyAuthService as any,
    subscriptionRepository as any,
    planRepository as any,
    billingPersistenceService as any,
  );

  try {
    const response = await service.createProviderSubscription({} as any, {
      provider: 'mercadopago',
      planId: 'mp-plan-1',
      cardTokenId: 'card-token-1',
      email: 'seller@example.com',
    });

    assert.equal(receivedCardToken, 'card-token-1');
    assert.equal(response.subscriptionId, 'mp-subscription-1');
    assert.equal(response.status, 'authorized');
    assert.equal(savedSubscription?.status, 'ACTIVE');
    assert.equal(savedSubscriber?.status, 'active');
    assert.ok(
      new Date(savedSubscription?.expirationDate).getTime() > beforeCreation,
    );
    assert.equal(
      new Date(savedSubscriber?.expirationDate).toISOString(),
      new Date(savedSubscription?.expirationDate).toISOString(),
    );
  } finally {
    if (originalAccessToken === undefined) {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    } else {
      process.env.MERCADOPAGO_ACCESS_TOKEN = originalAccessToken;
    }
    if (originalHostedTestMode === undefined) {
      delete process.env.MERCADOPAGO_HOSTED_TEST_MODE;
    } else {
      process.env.MERCADOPAGO_HOSTED_TEST_MODE = originalHostedTestMode;
    }
    if (originalTestMode === undefined) {
      delete process.env.MERCADOPAGO_TEST_MODE;
    } else {
      process.env.MERCADOPAGO_TEST_MODE = originalTestMode;
    }
  }
});

test('SubscriptionService rejects a real payer email in Mercado Pago TEST mode', async () => {
  const originalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const originalHostedTestMode = process.env.MERCADOPAGO_HOSTED_TEST_MODE;
  const originalTestMode = process.env.MERCADOPAGO_TEST_MODE;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-test-seller-access-token';
  process.env.MERCADOPAGO_HOSTED_TEST_MODE = 'false';
  process.env.MERCADOPAGO_TEST_MODE = 'true';

  const service = new SubscriptionService(
    {
      async getAuthorizedUser() {
        return { id: 'user-1', email: 'user@example.com' };
      },
    } as any,
    {
      async findActiveByUserId() {
        return [];
      },
      async createMercadoPagoSubscription() {
        assert.fail('A real payer email must be rejected before calling Mercado Pago');
      },
    } as any,
    {
      async findByPlanId() {
        return { id: 'plan-document-1' };
      },
    } as any,
    {} as any,
  );

  try {
    await assert.rejects(
      service.createProviderSubscription({} as any, {
        provider: 'mercadopago',
        planId: 'mp-plan-1',
        cardTokenId: 'card-token-1',
        email: 'user@example.com',
      }),
      (error: any) => {
        assert.equal(error.getStatus(), 409);
        assert.match(
          String(error.getResponse()?.message || ''),
          /comprador TEST/i,
        );
        return true;
      },
    );
  } finally {
    if (originalAccessToken === undefined) {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    } else {
      process.env.MERCADOPAGO_ACCESS_TOKEN = originalAccessToken;
    }
    if (originalHostedTestMode === undefined) {
      delete process.env.MERCADOPAGO_HOSTED_TEST_MODE;
    } else {
      process.env.MERCADOPAGO_HOSTED_TEST_MODE = originalHostedTestMode;
    }
    if (originalTestMode === undefined) {
      delete process.env.MERCADOPAGO_TEST_MODE;
    } else {
      process.env.MERCADOPAGO_TEST_MODE = originalTestMode;
    }
  }
});

test('SubscriptionService rejects creating another subscription while one is active', async () => {
  const service = new SubscriptionService(
    {
      async getAuthorizedUser() {
        return { id: 'user-1', email: 'user@example.com' };
      },
    } as any,
    {
      async findActiveByUserId(userId: string) {
        assert.equal(userId, 'user-1');
        return [{ id: 'active-subscription-1', status: 'ACTIVE' }];
      },
      async createMercadoPagoSubscription() {
        assert.fail('Mercado Pago must not be called for an active subscriber');
      },
    } as any,
    {
      async findByPlanId() {
        return { id: 'plan-document-1' };
      },
    } as any,
    {} as any,
  );

  await assert.rejects(
    service.createProviderSubscription({} as any, {
      provider: 'mercadopago',
      planId: 'mp-plan-1',
      cardTokenId: 'card-token-1',
      email: 'user@example.com',
    }),
    (error: any) => {
      assert.equal(error.getStatus(), 409);
      assert.match(
        String(error.getResponse()?.message || ''),
        /suscripción vigente/i,
      );
      return true;
    },
  );
});

test('SubscriptionService uses the authorized card flow with Mercado Pago TEST credentials', async () => {
  const originalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const originalHostedTestMode = process.env.MERCADOPAGO_HOSTED_TEST_MODE;
  const originalTestMode = process.env.MERCADOPAGO_TEST_MODE;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-access-token';
  process.env.MERCADOPAGO_HOSTED_TEST_MODE = 'true';
  process.env.MERCADOPAGO_TEST_MODE = 'true';

  let receivedCardToken = '';
  const subscriptionRepository = {
    async findActiveByUserId() {
      return [];
    },
    async getMercadoPagoPlan(planId: string) {
      assert.equal(planId, 'mp-plan-1');
      return { id: planId };
    },
    async createMercadoPagoSubscription(
      email: string,
      planId: string,
      cardTokenId: string,
    ) {
      assert.equal(email, 'test_user_1409758731@testuser.com');
      assert.equal(planId, 'mp-plan-1');
      receivedCardToken = cardTokenId;
      return {
        id: 'mp-subscription-1',
        status: 'authorized',
        next_payment_date: '2026-07-09T00:00:00.000Z',
      };
    },
    create(payload: Record<string, unknown>) {
      return payload;
    },
    async save(subscription: Record<string, unknown>) {
      return subscription;
    },
  };
  const billingPersistenceService = {
    async findSubscriberByUserId() {
      return null;
    },
    createSubscriber(payload: Record<string, unknown>) {
      return payload;
    },
    async saveSubscriber(subscriber: Record<string, unknown>) {
      return subscriber;
    },
  };

  const service = new SubscriptionService(
    {
      async getAuthorizedUser() {
        return { id: 'user-1', email: 'user@example.com' };
      },
    } as any,
    subscriptionRepository as any,
    {
      async findByPlanId() {
        return {
          id: 'plan-document-1',
          name: 'Suscripción Mensual',
          interval: 'months',
          intervalCount: 1,
          price: 5000,
          currency: 'ARS',
        };
      },
    } as any,
    billingPersistenceService as any,
  );

  try {
    const response = await service.createProviderSubscription({} as any, {
      provider: 'mercadopago',
      planId: 'mp-plan-1',
      cardTokenId: 'card-token-1',
      email: 'test_user_1409758731@testuser.com',
    });

    assert.equal(receivedCardToken, 'card-token-1');
    assert.equal(response.status, 'authorized');
    assert.equal(response.subscriptionId, 'mp-subscription-1');
  } finally {
    if (originalAccessToken === undefined) {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    } else {
      process.env.MERCADOPAGO_ACCESS_TOKEN = originalAccessToken;
    }
    if (originalHostedTestMode === undefined) {
      delete process.env.MERCADOPAGO_HOSTED_TEST_MODE;
    } else {
      process.env.MERCADOPAGO_HOSTED_TEST_MODE = originalHostedTestMode;
    }
    if (originalTestMode === undefined) {
      delete process.env.MERCADOPAGO_TEST_MODE;
    } else {
      process.env.MERCADOPAGO_TEST_MODE = originalTestMode;
    }
  }
});

test('SubscriptionService recreates a missing Mercado Pago plan in TEST mode', async () => {
  const originalTestMode = process.env.MERCADOPAGO_TEST_MODE;
  process.env.MERCADOPAGO_TEST_MODE = 'true';

  const localPlan = {
    id: 'plan-document-1',
    planId: 'missing-mp-plan',
    name: 'Suscripción Mensual',
    interval: 'months',
    intervalCount: 1,
    price: 5000,
    currency: 'ARS',
  };
  let updatedPlanId = '';
  let receivedPlanId = '';

  const service = new SubscriptionService(
    {
      async getAuthorizedUser() {
        return { id: 'user-1', email: 'user@example.com' };
      },
    } as any,
    {
      async findActiveByUserId() {
        return [];
      },
      async getMercadoPagoPlan(planId: string) {
        assert.equal(planId, 'missing-mp-plan');
        throw new Error(
          'The template with id missing-mp-plan does not exist',
        );
      },
      async createMercadoPagoSubscription(
        email: string,
        planId: string,
        cardTokenId: string,
      ) {
        assert.equal(email, 'test_user_buyer@testuser.com');
        assert.equal(cardTokenId, 'card-token-1');
        receivedPlanId = planId;
        return {
          id: 'mp-subscription-1',
          status: 'authorized',
          next_payment_date: '2026-07-09T00:00:00.000Z',
        };
      },
      create(payload: Record<string, unknown>) {
        return payload;
      },
      async save(subscription: Record<string, unknown>) {
        return subscription;
      },
    } as any,
    {
      async findByPlanId(planId: string) {
        assert.equal(planId, 'missing-mp-plan');
        return localPlan;
      },
      async createMercadoPagoPlan(payload: Record<string, unknown>) {
        assert.deepEqual(payload, {
          reason: 'Suscripción Mensual',
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 5000,
          currency_id: 'ARS',
        });
        return { id: 'replacement-mp-plan' };
      },
      async updateById(
        id: string,
        payload: Record<string, unknown>,
      ) {
        assert.equal(id, 'plan-document-1');
        updatedPlanId = String(payload.planId);
        return { ...localPlan, ...payload };
      },
    } as any,
    {
      async findSubscriberByUserId() {
        return null;
      },
      createSubscriber(payload: Record<string, unknown>) {
        return payload;
      },
      async saveSubscriber(subscriber: Record<string, unknown>) {
        return subscriber;
      },
    } as any,
  );

  try {
    const response = await service.createProviderSubscription({} as any, {
      provider: 'mercadopago',
      planId: 'missing-mp-plan',
      cardTokenId: 'card-token-1',
      email: 'test_user_buyer@testuser.com',
    });

    assert.equal(updatedPlanId, 'replacement-mp-plan');
    assert.equal(receivedPlanId, 'replacement-mp-plan');
    assert.equal(response.subscriptionId, 'mp-subscription-1');
  } finally {
    if (originalTestMode === undefined) {
      delete process.env.MERCADOPAGO_TEST_MODE;
    } else {
      process.env.MERCADOPAGO_TEST_MODE = originalTestMode;
    }
  }
});

test('SubscriptionService confirms a Mercado Pago subscription for the authenticated user', async () => {
  let savedSubscription: Record<string, any> | undefined;
  let savedSubscriber: Record<string, any> | undefined;

  const subscriptionRepository = {
    async getMercadoPagoSubscription(subscriptionId: string) {
      assert.equal(subscriptionId, 'mp-subscription-1');
      return {
        id: 'mp-subscription-1',
        status: 'authorized',
        next_payment_date: '2026-07-09T00:00:00.000Z',
      };
    },
    async findByProviderSubscriptionId() {
      return {
        id: 'subscription-document-1',
        userId: 'user-1',
        planId: 'plan-document-1',
        platform: 'mercadopago',
        status: 'APPROVAL_PENDING',
      };
    },
    create(payload: Record<string, unknown>) {
      return { ...payload };
    },
    async save(subscription: Record<string, any>) {
      savedSubscription = subscription;
      return subscription;
    },
  };

  const billingPersistenceService = {
    async findSubscriberByUserId() {
      return null;
    },
    createSubscriber(payload: Record<string, unknown>) {
      return { ...payload };
    },
    async saveSubscriber(subscriber: Record<string, any>) {
      savedSubscriber = subscriber;
      return subscriber;
    },
  };

  const service = new SubscriptionService(
    {
      async getAuthorizedUser() {
        return { id: 'user-1', email: 'user@example.com' };
      },
      assertSameUserIdOrAdmin(
        requester: { id: string },
        subscriptionUserId: string,
      ) {
        assert.equal(requester.id, subscriptionUserId);
      },
    } as any,
    subscriptionRepository as any,
    {
      async findById(planId: string) {
        assert.equal(planId, 'plan-document-1');
        return {
          id: 'plan-document-1',
          interval: 'MONTH',
          intervalCount: 1,
        };
      },
    } as any,
    billingPersistenceService as any,
  );

  const response = await service.confirmMercadoPagoSubscription(
    {} as any,
    'mp-subscription-1',
  );

  assert.equal(response.status, 'ACTIVE');
  assert.equal(savedSubscription?.userId, 'user-1');
  assert.equal(savedSubscription?.planId, 'plan-document-1');
  assert.equal(savedSubscriber?.status, 'active');
  assert.equal(
    new Date(savedSubscriber?.expirationDate).toISOString(),
    '2026-07-09T00:00:00.000Z',
  );
});

test('SubscriptionService.listSubscriptions returns user subscriptions enriched with plan data', async () => {
  const legacyAuthService = {
    async getAuthorizedUser() {
      return { id: 'user-1', email: 'user@example.com' };
    },
    assertSameUserIdOrAdmin() {},
  };

  const subscriptionRepository = {
    async findActiveByUserId(userId: string) {
      assert.equal(userId, 'user-1');
      return [
        {
          id: 'sub-1',
          planId: 'plan-doc-1',
          userId: 'user-1',
          status: 'ACTIVE',
          platform: 'paypal',
          subscriptionId: 'I-PAYPAL-1',
          toJSON() {
            return {
              id: this.id,
              planId: this.planId,
              userId: this.userId,
              status: this.status,
              platform: this.platform,
              subscriptionId: this.subscriptionId,
            };
          },
        },
      ];
    },
  };

  const planRepository = {
    async findById(id: string) {
      assert.equal(id, 'plan-doc-1');
      return {
        toJSON() {
          return {
            id: 'plan-doc-1',
            name: 'Premium mensual',
            provider: 'paypal',
          };
        },
      };
    },
  };

  const service = new SubscriptionService(
    legacyAuthService as any,
    subscriptionRepository as any,
    planRepository as any,
  );

  const response = await service.listSubscriptions({} as any);

  assert.equal(response.count, 1);
  assert.equal(response.suscriptions.length, 1);
  assert.equal(response.suscriptions[0].id, 'sub-1');
  assert.equal((response.suscriptions[0].plan as any).name, 'Premium mensual');
});

test('SubscriptionService.getSubscription blocks non-owner non-admin requests', async () => {
  const legacyAuthService = {
    async getAuthorizedUser() {
      return { id: 'user-2', role: 'user' };
    },
    assertSameUserIdOrAdmin() {
      throw new ForbiddenException('Not authorized.');
    },
  };

  const subscriptionRepository = {
    async findById(id: string) {
      assert.equal(id, 'sub-1');
      return {
        id: 'sub-1',
        userId: 'user-1',
        platform: 'paypal',
        subscriptionId: 'I-PAYPAL-1',
        toJSON() {
          return this;
        },
      };
    },
  };

  const service = new SubscriptionService(
    legacyAuthService as any,
    subscriptionRepository as any,
    {} as any,
  );

  await assert.rejects(service.getSubscription({} as any, 'sub-1'), (error: any) => {
    assert.equal(error.getStatus(), 403);
    const response = error.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : (response as any)?.message || (response as any)?.error;
    assert.match(String(message || ''), /forbidden|not authorized/i);
    return true;
  });
});

test('SubscriptionService.cancelSubscription allows the owner and calls provider cancellation', async () => {
  const legacyAuthService = {
    async getAuthorizedUser() {
      return { id: 'user-1', role: 'user' };
    },
    assertSameUserIdOrAdmin() {},
  };

  let cancelledProviderSubscriptionId = '';
  const subscriptionRepository = {
    async findById(id: string) {
      assert.equal(id, 'sub-1');
      return {
        id: 'sub-1',
        userId: 'user-1',
        platform: 'paypal',
        subscriptionId: 'I-PAYPAL-1',
        status: 'ACTIVE',
        toJSON() {
          return this;
        },
      };
    },
    async cancelPaypalSubscription(providerSubscriptionId: string) {
      cancelledProviderSubscriptionId = providerSubscriptionId;
    },
  };

  const service = new SubscriptionService(
    legacyAuthService as any,
    subscriptionRepository as any,
    {} as any,
  );

  const response = await service.cancelSubscription({} as any, 'sub-1');

  assert.equal(cancelledProviderSubscriptionId, 'I-PAYPAL-1');
  assert.equal(response.id, 'sub-1');
  assert.equal(response.platform, 'paypal');
});
