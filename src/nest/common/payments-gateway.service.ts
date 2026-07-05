import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, PreApproval, PreApprovalPlan } from 'mercadopago';

const PAYPAL_BASE_URL = process.env.PAYPAL_API_URL || '';

type MercadoPagoPlanPayload = {
  reason: string;
  frequency: number;
  frequency_type: string;
  transaction_amount: number;
  currency_id: string;
};

export type MercadoPagoHostedSubscriptionPayload = {
  payerEmail: string;
  reason: string;
  frequency: number;
  frequencyType: 'days' | 'months';
  transactionAmount: number;
  currencyId: string;
  externalReference: string;
};

@Injectable()
export class PaymentsGatewayService {
  private readonly mercadoPagoClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  });

  private readonly paypalClient: AxiosInstance = axios.create({
    baseURL: PAYPAL_BASE_URL,
  });

  private async getPaypalAccessToken(): Promise<string> {
    const auth = {
      username: process.env.PAYPAL_API_CLIENT_ID || '',
      password: process.env.PAYPAL_API_CLIENT_SECRET || '',
    };

    try {
      const response = await axios.post(
        `${PAYPAL_BASE_URL}/oauth2/token`,
        new URLSearchParams({ grant_type: 'client_credentials' }),
        {
          auth,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data.access_token;
    } catch (error: any) {
      const message =
        typeof error?.message === 'string'
          ? error.message
          : 'Failed to get PayPal access token';
      throw new Error(message);
    }
  }

  private async getPaypalHeaders(): Promise<Record<string, string>> {
    return {
      Authorization: `Bearer ${await this.getPaypalAccessToken()}`,
    };
  }

  async createPaypalSubscription(payload: Record<string, unknown>): Promise<any> {
    const headers = await this.getPaypalHeaders();
    const response = await this.paypalClient.post('/billing/subscriptions', payload, {
      headers,
    });
    return response.data;
  }

  async getPaypalSubscription(subscriptionId: string): Promise<any> {
    const headers = await this.getPaypalHeaders();
    const response = await this.paypalClient.get(
      `/billing/subscriptions/${subscriptionId}`,
      { headers },
    );
    return response.data;
  }

  private mpAxiosError(error: any): string {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      JSON.stringify(error?.response?.data) ||
      error?.message ||
      'unknown'
    );
  }

  private mercadoPagoBackUrl(): string {
    const configuredUrl =
      process.env.MERCADOPAGO_BACK_URL ||
      process.env.KOMUNICARE_QA_URL ||
      process.env.KOMUNICARE_URL ||
      '';

    return configuredUrl.startsWith('https://')
      ? `${configuredUrl.replace(/\/$/, '')}/settings/subscription`
      : 'https://komuni.care/settings/subscription';
  }

  async assertMercadoPagoTestSeller(): Promise<void> {
    try {
      const result = await axios.get(
        'https://api.mercadopago.com/users/me',
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          },
        },
      );
      const sellerEmail = String(result.data?.email || '').toLowerCase();

      if (!sellerEmail.endsWith('@testuser.com')) {
        throw new Error(
          'El Access Token configurado pertenece a un vendedor real. Usa el APP_USR de una aplicación creada desde el vendedor TEST.',
        );
      }
    } catch (error: any) {
      if (error instanceof Error && !(error as any)?.response) {
        throw error;
      }

      throw new Error(
        `No se pudo validar el vendedor TEST de Mercado Pago: ${this.mpAxiosError(error)}`,
      );
    }
  }

  async createMercadoPagoSubscription(
    email: string,
    planId: string,
    cardTokenId: string,
  ): Promise<any> {
    try {
      const body: Record<string, string> = {
        payer_email: email,
        preapproval_plan_id: planId,
        card_token_id: cardTokenId,
        status: 'authorized',
        back_url: this.mercadoPagoBackUrl(),
      };

      const result = await axios.post(
        'https://api.mercadopago.com/preapproval',
        body,
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      );
      console.log(
        '[MP] preapproval created:',
        result.data?.id,
        'status:',
        result.data?.status,
      );
      return result.data;
    } catch (error: any) {
      const mpError = this.mpAxiosError(error);
      console.error('[MP] createMercadoPagoSubscription error:', {
        mpError,
        responseData: JSON.stringify(error?.response?.data),
        status: error?.response?.status,
      });
      throw new Error(`MercadoPago: ${mpError}`);
    }
  }

  async getMercadoPagoPlan(planId: string): Promise<any> {
    const mercadoPagoPlan = new PreApprovalPlan(this.mercadoPagoClient);
    return mercadoPagoPlan.get({ preApprovalPlanId: planId });
  }

  async createMercadoPagoHostedSubscription(
    payload: MercadoPagoHostedSubscriptionPayload,
  ): Promise<any> {
    try {
      await this.assertMercadoPagoTestSeller();

      const result = await axios.post(
        'https://api.mercadopago.com/preapproval',
        {
          reason: payload.reason,
          external_reference: payload.externalReference,
          payer_email: payload.payerEmail,
          auto_recurring: {
            frequency: payload.frequency,
            frequency_type: payload.frequencyType,
            transaction_amount: payload.transactionAmount,
            currency_id: payload.currencyId,
          },
          back_url: this.mercadoPagoBackUrl(),
          status: 'pending',
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return result.data;
    } catch (error: any) {
      const mpError = this.mpAxiosError(error);
      console.error('[MP] createMercadoPagoHostedSubscription error:', {
        mpError,
        responseData: JSON.stringify(error?.response?.data),
        status: error?.response?.status,
      });
      throw new Error(`MercadoPago: ${mpError}`);
    }
  }

  async cancelPaypalSubscription(subscriptionId: string): Promise<any> {
    const headers = await this.getPaypalHeaders();
    const response = await this.paypalClient.post(
      `/billing/subscriptions/${subscriptionId}/cancel`,
      { reason: 'User cancelled' },
      { headers },
    );
    return response.data;
  }

  async cancelMercadoPagoSubscription(subscriptionId: string): Promise<any> {
    const mercadoPagoSubscription = new PreApproval(this.mercadoPagoClient);
    return mercadoPagoSubscription.update({
      id: subscriptionId,
      body: {
        status: 'cancelled',
      },
    });
  }

  async suspendPaypalSubscription(subscriptionId: string): Promise<any> {
    const headers = await this.getPaypalHeaders();
    const response = await this.paypalClient.post(
      `/billing/subscriptions/${subscriptionId}/suspend`,
      { reason: 'User cancelled' },
      { headers },
    );
    return response.data;
  }

  async suspendMercadoPagoSubscription(subscriptionId: string): Promise<any> {
    const mercadoPagoSubscription = new PreApproval(this.mercadoPagoClient);
    return mercadoPagoSubscription.update({
      id: subscriptionId,
      body: {
        status: 'paused',
      },
    });
  }

  async createPaypalPlan(payload: Record<string, unknown>): Promise<any> {
    const headers = await this.getPaypalHeaders();
    const response = await this.paypalClient.post('/billing/plans', payload, {
      headers,
    });
    return response.data;
  }

  async createMercadoPagoPlan(payload: MercadoPagoPlanPayload): Promise<any> {
    const mercadoPagoPlan = new PreApprovalPlan(this.mercadoPagoClient);
    return mercadoPagoPlan.create({
      body: {
        reason: payload.reason,
        auto_recurring: {
          frequency: payload.frequency,
          frequency_type: payload.frequency_type,
          transaction_amount: payload.transaction_amount,
          currency_id: payload.currency_id,
        },
        back_url: `${process.env.KOMUNICARE_URL}/mercado_pago_success`,
      },
    });
  }

  async createPaypalProduct(payload: {
    name: string;
    description: string;
    type: string;
    category?: string;
  }): Promise<any> {
    const headers = await this.getPaypalHeaders();
    const response = await this.paypalClient.post('/catalogs/products', payload, {
      headers,
    });
    return response.data;
  }

  async getPaypalProducts(): Promise<any> {
    const headers = await this.getPaypalHeaders();
    const response = await this.paypalClient.get('/catalogs/products', {
      headers,
    });
    return response.data;
  }

  async verifyPaypalWebhookSignature(
    headers: Record<string, string>,
    payload: any,
  ): Promise<boolean> {
    const authHeaders = await this.getPaypalHeaders();
    const response = await this.paypalClient.post(
      '/notifications/verify-webhook-signature',
      {
        transmission_id: headers['paypal-transmission-id'],
        transmission_time: headers['paypal-transmission-time'],
        cert_url: headers['paypal-cert-url'],
        auth_algo: headers['paypal-auth-algo'],
        transmission_sig: headers['paypal-transmission-sig'],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: payload,
      },
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.verification_status === 'SUCCESS';
  }

  async getMercadoPagoPreApproval(id: string): Promise<any> {
    const mercadoPagoSubscription = new PreApproval(this.mercadoPagoClient);
    return mercadoPagoSubscription.get({ id });
  }
}
