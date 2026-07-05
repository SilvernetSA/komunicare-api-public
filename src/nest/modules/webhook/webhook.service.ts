import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

import { WebhookResponseModel } from './models/webhook.model';
import { WebhookRepository } from './webhook.repository';

const MP_SECRET_KEY = process.env.MERCADOPAGO_SECRET_KEY as string;

interface ActiveFlowInput {
  subscriptionId: string;
  subscriptionEndTime: Date;
}

@Injectable()
export class WebhookService {
  constructor(private readonly webhookRepository: WebhookRepository) {}

  async handlePaypalWebhook(
    headers: Record<string, string>,
    payload: any,
  ): Promise<WebhookResponseModel> {
    try {
      const isValid = await this.webhookRepository.verifyPaypalWebhookSignature(
        headers,
        payload,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }

      const subscription = payload?.resource;
      switch (payload?.event_type) {
        case 'BILLING.SUBSCRIPTION.CREATED':
          break;
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await this.activeFlow({
            subscriptionId: subscription.id,
            subscriptionEndTime: new Date(
              subscription.billing_info.next_billing_time,
            ),
          });
          break;
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.webhookRepository.markSubscription({
            subscriptionId: subscription.id,
            status: 'CANCELLED',
          });
          break;
        case 'BILLING.SUBSCRIPTION.EXPIRED':
          await this.webhookRepository.markSubscription({
            subscriptionId: subscription.id,
            status: 'EXPIRED',
          });
          break;
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          await this.webhookRepository.markSubscription({
            subscriptionId: subscription.id,
            status: 'SUSPENDED',
          });
          break;
        case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
          await this.webhookRepository.markSubscription({
            subscriptionId: subscription.id,
            status: 'ACTIVE',
          });
          break;
        default:
          break;
      }

      return { message: 'OK' };
    } catch (error: any) {
      if (error?.getStatus) {
        throw error;
      }

      throw new ConflictException({
        message: 'Paypal Webhook Error',
        error,
      });
    }
  }

  async handleMercadoPagoWebhook(
    headers: Record<string, string>,
    payload: any,
    originalUrl: string,
  ): Promise<WebhookResponseModel> {
    try {
      const signatureHeader = headers['x-signature'];
      const requestId = headers['x-request-id'];

      if (!signatureHeader || !requestId) {
        throw new BadRequestException('Headers faltantes');
      }

      const parts = signatureHeader.split(',');
      let ts = '';
      let hash = '';

      parts.forEach((part) => {
        const [key, value] = part.split('=');
        if (key?.trim() === 'ts') {
          ts = value?.trim() || '';
        }
        if (key?.trim() === 'v1') {
          hash = value?.trim() || '';
        }
      });

      if (!ts || !hash) {
        throw new BadRequestException('Formato de X-Signature incorrecto');
      }

      const query = originalUrl.split('?')[1] || '';
      const urlParams = new URLSearchParams(query);
      const dataId = urlParams.get('data.id') || '';

      if (!dataId) {
        throw new BadRequestException('Falta el parámetro data.id');
      }

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const hmac = crypto.createHmac('sha256', MP_SECRET_KEY);
      hmac.update(manifest);
      const calculatedHash = hmac.digest('hex');

      if (calculatedHash !== hash) {
        throw new UnauthorizedException('Firma inválida');
      }

      switch (payload?.type) {
        case 'subscription_preapproval': {
          const preApproval = await this.webhookRepository.getMercadoPagoPreApproval(
            payload.data.id,
          );

          if (!preApproval) {
            return { message: 'OK' };
          }

          if (preApproval.status === 'authorized' && preApproval.id) {
            await this.activeFlow({
              subscriptionId: preApproval.id,
              subscriptionEndTime:
                this.resolveMercadoPagoExpirationDate(preApproval),
            });
          }

          if (preApproval.status === 'paused') {
            await this.webhookRepository.markSubscription({
              subscriptionId: preApproval.id,
              status: 'SUSPENDED',
            });
          }

          if (preApproval.status === 'cancelled') {
            await this.webhookRepository.markSubscription({
              subscriptionId: preApproval.id,
              status: 'CANCELLED',
            });
          }
          break;
        }
        default:
          break;
      }

      return { message: 'OK' };
    } catch (error: any) {
      if (error?.getStatus) {
        throw error;
      }

      throw new ConflictException({
        message: 'Mercado Pago Webhook Error',
        error,
      });
    }
  }

  private resolveMercadoPagoExpirationDate(preApproval: any): Date {
    const nextPaymentDate = new Date(preApproval?.next_payment_date || '');
    if (
      !Number.isNaN(nextPaymentDate.getTime()) &&
      nextPaymentDate.getTime() > Date.now()
    ) {
      return nextPaymentDate;
    }

    const expirationDate = new Date();
    const frequency = Math.max(
      1,
      Number(preApproval?.auto_recurring?.frequency || 1),
    );
    const frequencyType = String(
      preApproval?.auto_recurring?.frequency_type || 'months',
    ).toLowerCase();

    if (frequencyType === 'days') {
      expirationDate.setDate(expirationDate.getDate() + frequency);
    } else if (frequencyType === 'years') {
      expirationDate.setFullYear(expirationDate.getFullYear() + frequency);
    } else {
      expirationDate.setMonth(expirationDate.getMonth() + frequency);
    }

    return expirationDate;
  }

  private async activeFlow({
    subscriptionId,
    subscriptionEndTime,
  }: ActiveFlowInput): Promise<void> {
    const subscription = await this.webhookRepository.markSubscription({
      subscriptionId,
      status: 'ACTIVE',
      expirationDate: subscriptionEndTime,
    });

    if (!subscription) {
      return;
    }

    await this.webhookRepository.reviewSubscriber(subscription.userId);

    const subscriber = await this.webhookRepository.findSubscriberByUserId(
      subscription.userId,
    );
    if (!subscriber) {
      return;
    }

    const currentExpirationDate = subscriber.expirationDate
      ? new Date(subscriber.expirationDate)
      : null;
    const expirationDate =
      currentExpirationDate &&
      !Number.isNaN(currentExpirationDate.getTime()) &&
      currentExpirationDate > subscriptionEndTime
        ? currentExpirationDate
        : subscriptionEndTime;

    await this.webhookRepository.updateSubscriber({
      id: subscriber.id,
      status: 'ACTIVE',
      expirationDate,
    });
  }
}
