import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { LegacyAuthService } from '../../../common/legacy-auth.service';
import { withTransaction } from '../../../common/with-transaction';
import { PlanRepository } from '../../plan/plan.repository';
import { CreateProviderSubscriptionResponse, SubscriptionModel } from '../models/subscription.model';
import { SubscriptionRepository } from '../subscription.repository';
import { SubscriptionPersistenceService } from './subscription-persistence.service';

@Injectable()
export class PaypalSubscriptionService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly planRepository: PlanRepository,
    private readonly subscriptionPersistenceService: SubscriptionPersistenceService,
  ) {}

  private normalizePaypalStatus(status: string): string {
    const normalized = String(status || '').toUpperCase();

    if (
      normalized === 'ACTIVE' ||
      normalized === 'APPROVED' ||
      normalized === 'APPROVAL_PENDING'
    ) {
      return 'ACTIVE';
    }

    if (normalized === 'CANCELLED') return 'CANCELLED';
    if (normalized === 'SUSPENDED') return 'SUSPENDED';
    if (normalized === 'EXPIRED') return 'EXPIRED';

    return 'APPROVAL_PENDING';
  }

  private async resolveSubscriptionExpirationDate(
    subscription: any,
    remoteSubscription: any,
  ): Promise<Date> {
    const remoteNextBilling = remoteSubscription?.billing_info?.next_billing_time;
    if (remoteNextBilling) {
      const parsedDate = new Date(remoteNextBilling);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    if (subscription?.expirationDate) {
      const existingDate = new Date(subscription.expirationDate);
      if (!Number.isNaN(existingDate.getTime())) {
        return existingDate;
      }
    }

    const fallbackDate = new Date();
    const plan = await this.planRepository.findById(String(subscription.planId));
    const interval = String(plan?.interval || '').toUpperCase();
    const intervalCount = Number(plan?.intervalCount || 1);

    if (interval === 'YEAR' || interval === 'YEARS') {
      fallbackDate.setFullYear(fallbackDate.getFullYear() + intervalCount);
      return fallbackDate;
    }

    fallbackDate.setMonth(fallbackDate.getMonth() + intervalCount);
    return fallbackDate;
  }

  private assertSubscriptionOwnerOrAdmin(
    requester: { id?: string; _id?: string; role?: string; isAdmin?: boolean },
    subscriptionUserId: string,
  ): void {
    try {
      this.legacyAuthService.assertSameUserIdOrAdmin(
        requester as any,
        subscriptionUserId,
        'Not authorized.',
      );
    } catch {
      throw new ForbiddenException('Not authorized.');
    }
  }

  async initSubscription(
    requester: any,
    plan: any,
  ): Promise<CreateProviderSubscriptionResponse> {
    const subscription =
      await this.subscriptionRepository.createPaypalSubscription({
        plan_id: String(plan.id || plan._id || plan.planId || ''),
        quantity: 1,
        subscriber: {
          email_address: requester.email,
        },
        auto_renewal: true,
        application_context: {
          brand_name: 'Komunicare',
          return_url: `${process.env.KOMUNICARE_URL}/settings/subscription`,
          cancel_url: `${process.env.KOMUNICARE_URL}/settings/subscription`,
          user_action: 'SUBSCRIBE_NOW',
        },
      });

    const providerSubscriptionId = subscription?.id;
    if (!providerSubscriptionId) {
      throw new ConflictException({
        message: 'Error saving subscription',
        error: 'Invalid PayPal subscription response',
      });
    }

    await this.subscriptionPersistenceService.createSubscriptionRecord({
      status: 'APPROVAL_PENDING',
      platform: 'paypal',
      subscriptionId: providerSubscriptionId,
      planId: String(plan.id || plan._id),
      userId: requester.id,
    });

    return {
      link: subscription?.links?.[0]?.href,
    };
  }

  async confirmPaypalSubscription(
    req: Request,
    providerSubscriptionId: string,
  ): Promise<SubscriptionModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const requesterId = String(requester.id || requester._id || '');

    if (!requesterId) {
      throw new UnauthorizedException('Not authorized.');
    }

    const subscription =
      await this.subscriptionRepository.findByProviderSubscriptionId(
        providerSubscriptionId,
      );

    if (!subscription) {
      throw new NotFoundException(
        `Subscription does not exist. Provider subscription Id: ${providerSubscriptionId}`,
      );
    }

    this.assertSubscriptionOwnerOrAdmin(requester, String(subscription.userId));

    if (String(subscription.platform || '').toLowerCase() !== 'paypal') {
      throw new ConflictException('Subscription is not a PayPal subscription.');
    }

    const remoteSubscription =
      await this.subscriptionRepository.getPaypalSubscription(
        providerSubscriptionId,
      );

    const remoteStatus = String(remoteSubscription?.status || '').toUpperCase();
    const normalizedStatus = this.normalizePaypalStatus(remoteStatus);
    const expirationDate = await this.resolveSubscriptionExpirationDate(
      subscription,
      remoteSubscription,
    );

    subscription.status = normalizedStatus;
    subscription.expirationDate = expirationDate;

    await withTransaction(async (session) => {
      await this.subscriptionRepository.save(subscription, session);
      await this.subscriptionPersistenceService.syncSubscriberStatus(
        String(subscription.userId),
        normalizedStatus,
        expirationDate,
        session,
      );
    });

    return this.subscriptionPersistenceService.toSubscriptionModel(subscription);
  }
}
