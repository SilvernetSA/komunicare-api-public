import { Injectable } from '@nestjs/common';

import { BillingPersistenceService } from '../../common/billing-persistence.service';
import { PaymentsGatewayService } from '../../common/payments-gateway.service';

@Injectable()
export class ProductRepository {
  constructor(
    private readonly billingPersistence: BillingPersistenceService,
    private readonly paymentsGateway: PaymentsGatewayService,
  ) {}

  async createProduct(payload: {
    name: string;
    description: string;
    type: string;
    category?: string;
  }): Promise<any> {
    return this.paymentsGateway.createPaypalProduct(payload);
  }

  async getProducts(): Promise<any> {
    return this.paymentsGateway.getPaypalProducts();
  }

  createLocalProduct(payload: Record<string, unknown>): any {
    return this.billingPersistence.createProduct(payload);
  }

  async save(product: any): Promise<any> {
    return this.billingPersistence.saveProduct(product);
  }
}
