import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { BillingPersistenceService } from '../../common/billing-persistence.service';
import { LegacyAuthService } from '../../common/legacy-auth.service';
import { PlanRepository } from '../plan/plan.repository';
import { CreateProviderSubscriptionDto } from './dto/create-provider-subscription.dto';
import {
  CreateProviderSubscriptionResponse,
  SubscriptionListItem,
  SubscriptionListResponse,
  SubscriptionModel,
} from './models/subscription.model';
import { SubscriptionRepository } from './subscription.repository';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly planRepository: PlanRepository,
    private readonly billingPersistenceService: BillingPersistenceService,
  ) {}

  async createProviderSubscription(
    req: Request,
    payload: CreateProviderSubscriptionDto,
  ): Promise<CreateProviderSubscriptionResponse> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);

    if (!requester.id || !requester.email) {
      throw new UnauthorizedException({
        message: 'Error getting subscriber',
        error:
          'Unauthorized request, subscriber object is only accessible with subscriber user authToken',
      });
    }

    if (payload.provider !== 'paypal' && payload.provider !== 'mercadopago') {
      throw new InternalServerErrorException({
        error: 'Provider not valid.',
      });
    }

    try {
      const plan = await this.planRepository.findByPlanId(payload.planId);

      if (!plan) {
        throw new ConflictException({
          message: 'Error saving subscription',
          error: 'Plan do not exists',
        });
      }

      const activeSubscriptions =
        await this.subscriptionRepository.findActiveByUserId(requester.id);
      if (activeSubscriptions.length > 0) {
        throw new ConflictException({
          message: 'El usuario ya tiene una suscripción vigente.',
          error: 'User already has an active subscription.',
        });
      }

      if (payload.provider === 'paypal') {
        const subscription =
          await this.subscriptionRepository.createPaypalSubscription({
            plan_id: payload.planId,
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

        await this.createSubscriptionRecord({
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

      if (!payload.cardTokenId) {
        throw new ConflictException({
          message: 'Error saving subscription',
          error: 'card_token_id is required',
        });
      }

      const mercadoPagoPayerEmail =
        payload.email?.trim().toLowerCase() || requester.email;

      if (
        process.env.MERCADOPAGO_TEST_MODE === 'true' &&
        !/^[^\s@]+@testuser\.com$/i.test(mercadoPagoPayerEmail)
      ) {
        throw new ConflictException({
          message:
            'En desarrollo, el pagador debe ser un comprador TEST de Mercado Pago.',
          error:
            'Mercado Pago test payer email must end with @testuser.com.',
        });
      }

      const mercadoPagoPlanId =
        await this.resolveMercadoPagoPlanId(plan, payload.planId);
      const subscription =
        await this.subscriptionRepository.createMercadoPagoSubscription(
          mercadoPagoPayerEmail,
          mercadoPagoPlanId,
          payload.cardTokenId as string,
        );

      const providerSubscriptionId = subscription?.id;
      if (!providerSubscriptionId) {
        throw new ConflictException({
          message: 'Error saving subscription',
          error: 'Invalid Mercado Pago subscription response',
        });
      }

      const normalizedStatus = this.normalizeMercadoPagoStatus(
        subscription?.status,
      );
      const expirationDate = this.resolveMercadoPagoExpirationDate(
        subscription,
        plan,
      );

      await this.createSubscriptionRecord({
        status: normalizedStatus,
        platform: 'mercadopago',
        subscriptionId: providerSubscriptionId,
        planId: String(plan.id || plan._id),
        userId: requester.id,
        expirationDate,
      });

      if (normalizedStatus === 'ACTIVE') {
        await this.syncSubscriberStatus(
          requester.id,
          normalizedStatus,
          expirationDate,
        );
      }

      return {
        init_point: subscription?.init_point,
        subscriptionId: providerSubscriptionId,
        status: subscription?.status,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      const detail = error instanceof Error ? error.message : 'Unknown error';
      console.error('[subscription] createProviderSubscription failed:', detail);
      throw new ConflictException({
        message: detail,
        error: detail,
      });
    }
  }

  async getSubscription(
    req: Request,
    subscriptionId: string,
  ): Promise<SubscriptionModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const subscription = await this.getSubscriptionDocumentOrFail(subscriptionId);

    this.assertSubscriptionOwnerOrAdmin(
      requester,
      String(subscription.userId),
    );

    return this.toSubscriptionModel(subscription);
  }

  async listSubscriptions(req: Request): Promise<SubscriptionListResponse> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const requesterId = requester.id;

    if (!requesterId) {
      throw new UnauthorizedException('Not authorized.');
    }

    const subscriptions =
      await this.subscriptionRepository.findActiveByUserId(requesterId);

    const enrichedSubscriptions: SubscriptionListItem[] = [];

    for (const subscription of subscriptions) {
      const plan = await this.planRepository.findById(String(subscription.planId));
      enrichedSubscriptions.push({
        ...(subscription.toJSON() as SubscriptionModel),
        plan: plan ? plan.toJSON() : null,
      });
    }

    return {
      suscriptions: enrichedSubscriptions,
      count: enrichedSubscriptions.length,
    };
  }

  async cancelSubscription(
    req: Request,
    subscriptionId: string,
  ): Promise<SubscriptionModel> {
    const subscription = await this.getSubscription(req, subscriptionId);

    try {
      if (subscription.platform === 'paypal') {
        await this.subscriptionRepository.cancelPaypalSubscription(
          subscription.subscriptionId,
        );
      }

      if (subscription.platform === 'mercadopago') {
        await this.subscriptionRepository.cancelMercadoPagoSubscription(
          subscription.subscriptionId,
        );
      }

      return subscription;
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error canceling subscription',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async suspendSubscription(
    req: Request,
    subscriptionId: string,
  ): Promise<SubscriptionModel> {
    const subscription = await this.getSubscription(req, subscriptionId);

    try {
      if (subscription.platform === 'paypal') {
        await this.subscriptionRepository.suspendPaypalSubscription(
          subscription.subscriptionId,
        );
      }

      if (subscription.platform === 'mercadopago') {
        await this.subscriptionRepository.suspendMercadoPagoSubscription(
          subscription.subscriptionId,
        );
      }

      return subscription;
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error supending subscription',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
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
    await this.subscriptionRepository.save(subscription);

    let subscriber = await this.billingPersistenceService.findSubscriberByUserId(
      String(subscription.userId),
    );

    if (!subscriber) {
      subscriber = this.billingPersistenceService.createSubscriber({
        userId: String(subscription.userId),
        status: 'not_subscribed',
      });
    }

    if (normalizedStatus === 'ACTIVE') {
      subscriber.status = 'active';
      subscriber.expirationDate = expirationDate;
      if ((subscriber as any).cancelledAt) {
        (subscriber as any).cancelledAt = undefined;
      }
    } else if (normalizedStatus === 'CANCELLED') {
      subscriber.status = 'cancelled';
      if (!(subscriber as any).cancelledAt) {
        (subscriber as any).cancelledAt = new Date();
      }
    } else if (normalizedStatus === 'SUSPENDED') {
      subscriber.status = 'suspended';
    } else {
      subscriber.status = 'not_subscribed';
    }

    await this.billingPersistenceService.saveSubscriber(subscriber);

    return this.toSubscriptionModel(subscription);
  }

  async confirmMercadoPagoSubscription(
    req: Request,
    providerSubscriptionId: string,
  ): Promise<SubscriptionModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const requesterId = String(requester.id || requester._id || '');

    if (!requesterId) {
      throw new UnauthorizedException('Not authorized.');
    }

    const remoteSubscription =
      await this.subscriptionRepository.getMercadoPagoSubscription(
        providerSubscriptionId,
      );

    if (!remoteSubscription?.id) {
      throw new ConflictException(
        'Invalid Mercado Pago subscription response.',
      );
    }

    let subscription =
      await this.subscriptionRepository.findByProviderSubscriptionId(
        providerSubscriptionId,
      );
    let plan: any;

    if (subscription) {
      this.assertSubscriptionOwnerOrAdmin(
        requester,
        String(subscription.userId),
      );

      if (
        String(subscription.platform || '').toLowerCase() !== 'mercadopago'
      ) {
        throw new ConflictException(
          'Subscription is not a Mercado Pago subscription.',
        );
      }

      plan = await this.planRepository.findById(String(subscription.planId));
    } else {
      const remotePlanId = String(
        remoteSubscription?.preapproval_plan_id || '',
      );

      if (!remotePlanId) {
        throw new ConflictException(
          'Mercado Pago subscription is not linked to a local plan.',
        );
      }

      plan = await this.planRepository.findByPlanId(remotePlanId);
      if (!plan) {
        throw new ConflictException('Mercado Pago plan is not configured.');
      }

      subscription = this.subscriptionRepository.create({
        status: 'APPROVAL_PENDING',
        platform: 'mercadopago',
        subscriptionId: providerSubscriptionId,
        planId: String(plan.id || plan._id),
        userId: requesterId,
      });
    }

    if (!plan) {
      throw new ConflictException('Mercado Pago plan is not configured.');
    }

    const normalizedStatus = this.normalizeMercadoPagoStatus(
      remoteSubscription.status,
    );
    const expirationDate = this.resolveMercadoPagoExpirationDate(
      remoteSubscription,
      plan,
    );

    subscription.status = normalizedStatus;
    subscription.expirationDate = expirationDate;
    await this.subscriptionRepository.save(subscription);
    await this.syncSubscriberStatus(
      String(subscription.userId),
      normalizedStatus,
      expirationDate,
    );

    return this.toSubscriptionModel(subscription);
  }

  private async createSubscriptionRecord(
    payload: Record<string, unknown>,
  ): Promise<SubscriptionModel> {
    const subscription = this.subscriptionRepository.create(payload);
    const savedSubscription = await this.subscriptionRepository.save(subscription);

    return typeof savedSubscription.toJSON === 'function'
      ? (savedSubscription.toJSON() as SubscriptionModel)
      : (savedSubscription as SubscriptionModel);
  }

  private async getSubscriptionDocumentOrFail(subscriptionId: string): Promise<any> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);

    if (!subscription) {
      throw new NotFoundException(
        `Subscription does not exist. Subscription Id: ${subscriptionId}`,
      );
    }

    return subscription;
  }

  private toSubscriptionModel(subscription: any): SubscriptionModel {
    return typeof subscription.toJSON === 'function'
      ? (subscription.toJSON() as SubscriptionModel)
      : (subscription as SubscriptionModel);
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

  private normalizePaypalStatus(status: string): string {
    const normalized = String(status || '').toUpperCase();

    if (
      normalized === 'ACTIVE' ||
      normalized === 'APPROVED' ||
      normalized === 'APPROVAL_PENDING'
    ) {
      return 'ACTIVE';
    }

    if (normalized === 'CANCELLED') {
      return 'CANCELLED';
    }

    if (normalized === 'SUSPENDED') {
      return 'SUSPENDED';
    }

    if (normalized === 'EXPIRED') {
      return 'EXPIRED';
    }

    return 'APPROVAL_PENDING';
  }

  private normalizeMercadoPagoStatus(status: string): string {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'authorized') return 'ACTIVE';
    if (normalized === 'cancelled') return 'CANCELLED';
    if (normalized === 'paused') return 'SUSPENDED';

    return 'APPROVAL_PENDING';
  }

  private async resolveMercadoPagoPlanId(
    plan: any,
    requestedPlanId: string,
  ): Promise<string> {
    const currentPlanId = String(plan?.planId || requestedPlanId || '');

    if (!currentPlanId) {
      throw new ConflictException('Mercado Pago plan is not configured.');
    }

    if (process.env.MERCADOPAGO_TEST_MODE !== 'true') {
      return currentPlanId;
    }

    try {
      await this.subscriptionRepository.getMercadoPagoPlan(currentPlanId);
      return currentPlanId;
    } catch (error) {
      if (!this.isMissingMercadoPagoPlanError(error)) {
        throw error;
      }
    }

    const interval = String(plan?.interval || '').toLowerCase();
    const intervalCount = Math.max(1, Number(plan?.intervalCount || 1));
    const usesYears = interval === 'year' || interval === 'years';
    const recreatedPlan =
      await this.planRepository.createMercadoPagoPlan({
        reason: String(plan?.name || 'Suscripción Komunicare'),
        frequency: usesYears ? intervalCount * 12 : intervalCount,
        frequency_type:
          interval === 'day' || interval === 'days' ? 'days' : 'months',
        transaction_amount: Number(plan?.price),
        currency_id: String(plan?.currency || 'ARS'),
      });
    const recreatedPlanId = String(recreatedPlan?.id || '');

    if (!recreatedPlanId) {
      throw new ConflictException(
        'Mercado Pago did not return a plan id.',
      );
    }

    const localPlanId = String(plan?.id || plan?._id || '');
    if (!localPlanId) {
      throw new ConflictException('Local Mercado Pago plan is not configured.');
    }

    await this.planRepository.updateById(localPlanId, {
      planId: recreatedPlanId,
    });
    plan.planId = recreatedPlanId;

    console.log(
      '[MP] recreated missing test plan:',
      currentPlanId,
      '->',
      recreatedPlanId,
    );

    return recreatedPlanId;
  }

  private isMissingMercadoPagoPlanError(error: any): boolean {
    const status = Number(
      error?.status ||
        error?.response?.status ||
        error?.cause?.status ||
        0,
    );
    const detail = [
      error?.message,
      error?.response?.data?.message,
      error?.response?.data?.error,
      error?.cause?.message,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      status === 404 ||
      /template with id .* does not exist/.test(detail) ||
      /preapproval.*plan.*(does not exist|not found)/.test(detail)
    );
  }

  private resolveMercadoPagoExpirationDate(
    remoteSubscription: any,
    plan: any,
  ): Date {
    if (remoteSubscription?.next_payment_date) {
      const nextPaymentDate = new Date(remoteSubscription.next_payment_date);
      if (
        !Number.isNaN(nextPaymentDate.getTime()) &&
        nextPaymentDate.getTime() > Date.now()
      ) {
        return nextPaymentDate;
      }
    }

    const expirationDate = new Date();
    const intervalCount = Number(plan?.intervalCount || 1);
    if (String(plan?.interval || '').toUpperCase() === 'YEAR') {
      expirationDate.setFullYear(expirationDate.getFullYear() + intervalCount);
    } else {
      expirationDate.setMonth(expirationDate.getMonth() + intervalCount);
    }
    return expirationDate;
  }

  private async syncSubscriberStatus(
    userId: string,
    subscriptionStatus: string,
    expirationDate: Date,
  ): Promise<void> {
    let subscriber =
      await this.billingPersistenceService.findSubscriberByUserId(userId);

    if (!subscriber) {
      subscriber = this.billingPersistenceService.createSubscriber({
        userId,
        status: 'not_subscribed',
      });
    }

    if (subscriptionStatus === 'ACTIVE') {
      subscriber.status = 'active';
      subscriber.expirationDate = expirationDate;
      if ((subscriber as any).cancelledAt) {
        (subscriber as any).cancelledAt = undefined;
      }
    } else if (subscriptionStatus === 'CANCELLED') {
      subscriber.status = 'cancelled';
      if (!(subscriber as any).cancelledAt) {
        (subscriber as any).cancelledAt = new Date();
      }
    } else if (subscriptionStatus === 'SUSPENDED') {
      subscriber.status = 'suspended';
    } else {
      subscriber.status = 'not_subscribed';
    }

    await this.billingPersistenceService.saveSubscriber(subscriber);
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
}
