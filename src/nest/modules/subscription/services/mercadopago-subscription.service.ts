import {
  ConflictException,
  ForbiddenException,
  Injectable,
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
export class MercadopagoSubscriptionService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly planRepository: PlanRepository,
    private readonly subscriptionPersistenceService: SubscriptionPersistenceService,
  ) {}

  private normalizeMercadoPagoStatus(status: string): string {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'authorized') return 'ACTIVE';
    if (normalized === 'cancelled') return 'CANCELLED';
    if (normalized === 'paused') return 'SUSPENDED';
    return 'APPROVAL_PENDING';
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
    const recreatedPlan = await this.planRepository.createMercadoPagoPlan({
      reason: String(plan?.name || 'Suscripción Komunicare'),
      frequency: usesYears ? intervalCount * 12 : intervalCount,
      frequency_type:
        interval === 'day' || interval === 'days' ? 'days' : 'months',
      transaction_amount: Number(plan?.price),
      currency_id: String(plan?.currency || 'ARS'),
    });
    const recreatedPlanId = String(recreatedPlan?.id || '');

    if (!recreatedPlanId) {
      throw new ConflictException('Mercado Pago did not return a plan id.');
    }

    const localPlanId = String(plan?.id || plan?._id || '');
    if (!localPlanId) {
      throw new ConflictException('Local Mercado Pago plan is not configured.');
    }

    await this.planRepository.updateById(localPlanId, { planId: recreatedPlanId });
    plan.planId = recreatedPlanId;

    console.log(
      '[MP] recreated missing test plan:',
      currentPlanId,
      '->',
      recreatedPlanId,
    );

    return recreatedPlanId;
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
    cardTokenId: string,
    email?: string,
  ): Promise<CreateProviderSubscriptionResponse> {
    const mercadoPagoPayerEmail =
      email?.trim().toLowerCase() || requester.email;

    if (
      process.env.MERCADOPAGO_TEST_MODE === 'true' &&
      !/^[^\s@]+@testuser\.com$/i.test(mercadoPagoPayerEmail)
    ) {
      throw new ConflictException({
        message:
          'En desarrollo, el pagador debe ser un comprador TEST de Mercado Pago.',
        error: 'Mercado Pago test payer email must end with @testuser.com.',
      });
    }

    const mercadoPagoPlanId = await this.resolveMercadoPagoPlanId(
      plan,
      String(plan?.planId || plan?.id || ''),
    );
    const subscription =
      await this.subscriptionRepository.createMercadoPagoSubscription(
        mercadoPagoPayerEmail,
        mercadoPagoPlanId,
        cardTokenId,
      );

    const providerSubscriptionId = subscription?.id;
    if (!providerSubscriptionId) {
      throw new ConflictException({
        message: 'Error saving subscription',
        error: 'Invalid Mercado Pago subscription response',
      });
    }

    const normalizedStatus = this.normalizeMercadoPagoStatus(subscription?.status);
    const expirationDate = this.resolveMercadoPagoExpirationDate(subscription, plan);

    await this.subscriptionPersistenceService.createSubscriptionRecord({
      status: normalizedStatus,
      platform: 'mercadopago',
      subscriptionId: providerSubscriptionId,
      planId: String(plan.id || plan._id),
      userId: requester.id,
      expirationDate,
    });

    if (normalizedStatus === 'ACTIVE') {
      await this.subscriptionPersistenceService.syncSubscriberStatus(
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
      throw new ConflictException('Invalid Mercado Pago subscription response.');
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

      if (String(subscription.platform || '').toLowerCase() !== 'mercadopago') {
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
