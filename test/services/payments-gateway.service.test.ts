import test from 'node:test';
import assert from 'node:assert/strict';
import nock from 'nock';

import { PaymentsGatewayService } from '../../src/nest/common/payments-gateway.service';

test('PaymentsGatewayService accepts a Mercado Pago TEST seller', async () => {
  const originalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-test-seller-access-token';

  const mercadoPago = nock('https://api.mercadopago.com')
    .get('/users/me')
    .reply(200, {
      email: 'test_user_seller@testuser.com',
    });

  try {
    await new PaymentsGatewayService().assertMercadoPagoTestSeller();
    assert.equal(mercadoPago.isDone(), true);
  } finally {
    nock.cleanAll();
    if (originalAccessToken === undefined) {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    } else {
      process.env.MERCADOPAGO_ACCESS_TOKEN = originalAccessToken;
    }
  }
});

test('PaymentsGatewayService rejects a real Mercado Pago seller in hosted TEST mode', async () => {
  const originalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-real-seller-access-token';

  nock('https://api.mercadopago.com').get('/users/me').reply(200, {
    email: 'seller@example.com',
  });

  try {
    await assert.rejects(
      new PaymentsGatewayService().assertMercadoPagoTestSeller(),
      /vendedor real/i,
    );
  } finally {
    nock.cleanAll();
    if (originalAccessToken === undefined) {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    } else {
      process.env.MERCADOPAGO_ACCESS_TOKEN = originalAccessToken;
    }
  }
});
