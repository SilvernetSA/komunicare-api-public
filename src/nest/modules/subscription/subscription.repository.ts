import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';

import { BillingPersistenceService } from '../../common/billing-persistence.service';
import {
  MercadoPagoHostedSubscriptionPayload,
  PaymentsGatewayService,
} from '../../common/payments-gateway.service';

@Injectable()
export class SubscriptionRepository {
  constructor(
    private readonly billingPersistence: BillingPersistenceService,
    private readonly paymentsGateway: PaymentsGatewayService,
  ) {}

  async findById(id: string): Promise<any | null> {
    return this.billingPersistence.findSubscriptionById(id);
  }

  async findByProviderSubscriptionId(subscriptionId: string): Promise<any | null> {
    return this.billingPersistence.findSubscriptionByProviderId(subscriptionId);
  }

  async findActiveByUserId(userId: string): Promise<any[]> {
    return this.billingPersistence.findActiveSubscriptionsByUserId(userId);
  }

  async createPaypalSubscription(payload: Record<string, unknown>): Promise<any> {
    return this.paymentsGateway.createPaypalSubscription(payload);
  }

  async getPaypalSubscription(subscriptionId: string): Promise<any> {
    return this.paymentsGateway.getPaypalSubscription(subscriptionId);
  }

  async createMercadoPagoSubscription(
    email: string,
    planId: string,
    cardTokenId: string,
  ): Promise<any> {
    return this.paymentsGateway.createMercadoPagoSubscription(
      email,
      planId,
      cardTokenId,
    );
  }

  async getMercadoPagoPlan(planId: string): Promise<any> {
    return this.paymentsGateway.getMercadoPagoPlan(planId);
  }

  async createMercadoPagoHostedSubscription(
    payload: MercadoPagoHostedSubscriptionPayload,
  ): Promise<any> {
    return this.paymentsGateway.createMercadoPagoHostedSubscription(payload);
  }

  async getMercadoPagoSubscription(subscriptionId: string): Promise<any> {
    return this.paymentsGateway.getMercadoPagoPreApproval(subscriptionId);
  }

  async cancelPaypalSubscription(subscriptionId: string): Promise<any> {
    return this.paymentsGateway.cancelPaypalSubscription(subscriptionId);
  }

  async cancelMercadoPagoSubscription(subscriptionId: string): Promise<any> {
    return this.paymentsGateway.cancelMercadoPagoSubscription(subscriptionId);
  }

  async suspendPaypalSubscription(subscriptionId: string): Promise<any> {
    return this.paymentsGateway.suspendPaypalSubscription(subscriptionId);
  }

  async suspendMercadoPagoSubscription(subscriptionId: string): Promise<any> {
    return this.paymentsGateway.suspendMercadoPagoSubscription(subscriptionId);
  }

  create(payload: Record<string, unknown>): any {
    return this.billingPersistence.createSubscription(payload);
  }

  async save(subscription: any, session?: ClientSession): Promise<any> {
    return this.billingPersistence.saveSubscription(subscription, session);
  }
}
