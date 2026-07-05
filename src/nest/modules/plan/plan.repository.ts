import { Injectable } from '@nestjs/common';

import { BillingPersistenceService } from '../../common/billing-persistence.service';
import { PaymentsGatewayService } from '../../common/payments-gateway.service';

@Injectable()
export class PlanRepository {
  constructor(
    private readonly billingPersistence: BillingPersistenceService,
    private readonly paymentsGateway: PaymentsGatewayService,
  ) {}

  async findAll(): Promise<any[]> {
    return this.billingPersistence.findAllPlans();
  }

  async findById(id: string): Promise<any | null> {
    return this.billingPersistence.findPlanById(id);
  }

  async findByPlanId(planId: string): Promise<any | null> {
    return this.billingPersistence.findPlanByPlanId(planId);
  }

  async findFirstProduct(): Promise<any | null> {
    return this.billingPersistence.findFirstProduct();
  }

  async createPaypalPlan(payload: Record<string, unknown>): Promise<any> {
    return this.paymentsGateway.createPaypalPlan(payload);
  }

  async createMercadoPagoPlan(payload: {
    reason: string;
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  }): Promise<any> {
    return this.paymentsGateway.createMercadoPagoPlan(payload);
  }

  create(payload: Record<string, unknown>): any {
    return this.billingPersistence.createPlan(payload);
  }

  async save(plan: any): Promise<any> {
    return this.billingPersistence.savePlan(plan);
  }

  async updateById(id: string, payload: Record<string, unknown>): Promise<any | null> {
    return this.billingPersistence.updatePlanById(id, payload);
  }

  async deleteById(id: string): Promise<any | null> {
    return this.billingPersistence.deletePlanById(id);
  }
}
