import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';

import { PlanPersistenceModel } from './models/plan.persistence-model';
import { ProductPersistenceModel } from './models/product.persistence-model';
import { SubscriberPersistenceEntity } from './models/subscriber.persistence-model';
import { SubscriptionPersistenceModel } from './models/subscription.persistence-model';

@Injectable()
export class BillingPersistenceService {
  async findAllPlans(): Promise<any[]> {
    return (PlanPersistenceModel as any).find().exec();
  }

  async findPlanById(id: string): Promise<any | null> {
    return (PlanPersistenceModel as any).findById(id).exec();
  }

  async updatePlanById(id: string, payload: Record<string, unknown>): Promise<any | null> {
    return (PlanPersistenceModel as any)
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();
  }

  async deletePlanById(id: string): Promise<any | null> {
    return (PlanPersistenceModel as any).findByIdAndDelete(id).exec();
  }

  async findPlanByPlanId(planId: string): Promise<any | null> {
    return (PlanPersistenceModel as any).findOne({ planId }).exec();
  }

  createPlan(payload: Record<string, unknown>): any {
    return new (PlanPersistenceModel as any)(payload);
  }

  async savePlan(plan: any): Promise<any> {
    return plan.save();
  }

  async findFirstProduct(): Promise<any | null> {
    return (ProductPersistenceModel as any).findOne().exec();
  }

  createProduct(payload: Record<string, unknown>): any {
    return new (ProductPersistenceModel as any)(payload);
  }

  async saveProduct(product: any): Promise<any> {
    return product.save();
  }

  async findSubscriptionById(id: string): Promise<any | null> {
    return (SubscriptionPersistenceModel as any).findById(id).exec();
  }

  async findSubscriptionByProviderId(subscriptionId: string): Promise<any | null> {
    return (SubscriptionPersistenceModel as any)
      .findOne({ subscriptionId })
      .exec();
  }

  async findActiveSubscriptionsByUserId(userId: string): Promise<any[]> {
    return (SubscriptionPersistenceModel as any)
      .find({
        $and: [
          { userId },
          { expirationDate: { $gte: new Date() } },
          {
            $or: [
              { status: 'ACTIVE' },
              { status: 'SUSPENDED' },
              { status: 'CANCELLED' },
            ],
          },
        ],
      })
      .sort({ expirationDate: -1 })
      .exec();
  }

  createSubscription(payload: Record<string, unknown>): any {
    return new (SubscriptionPersistenceModel as any)(payload);
  }

  async saveSubscription(subscription: any, session?: ClientSession): Promise<any> {
    return session ? subscription.save({ session }) : subscription.save();
  }

  async findAllSubscribers(
    filter: Record<string, unknown> = {},
    skip = 0,
    limit = 50,
  ): Promise<{ data: any[]; total: number }> {
    const [data, total] = await Promise.all([
      (SubscriberPersistenceEntity as any)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      (SubscriberPersistenceEntity as any).countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async findSubscriberByUserId(userId: string): Promise<any | null> {
    return (SubscriberPersistenceEntity as any).findOne({ userId }).exec();
  }

  async findSubscriberById(id: string): Promise<any | null> {
    return (SubscriberPersistenceEntity as any).findById(id).exec();
  }

  createSubscriber(payload: Record<string, unknown>): any {
    return new (SubscriberPersistenceEntity as any)(payload);
  }

  async saveSubscriber(subscriber: any, session?: ClientSession): Promise<any> {
    return session ? subscriber.save({ session }) : subscriber.save();
  }
}
