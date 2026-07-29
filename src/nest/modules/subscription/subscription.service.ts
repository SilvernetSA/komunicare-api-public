import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

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
import { MercadopagoSubscriptionService } from './services/mercadopago-subscription.service';
import { PaypalSubscriptionService } from './services/paypal-subscription.service';
import { SubscriptionPersistenceService } from './services/subscription-persistence.service';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly planRepository: PlanRepository,
    private readonly paypalSubscriptionService: PaypalSubscriptionService,
    private readonly mercadopagoSubscriptionService: MercadopagoSubscriptionService,
    private readonly subscriptionPersistenceService: SubscriptionPersistenceService,
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
      throw new InternalServerErrorException({ error: 'Provider not valid.' });
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
        return this.paypalSubscriptionService.initSubscription(requester, plan);
      }

      if (!payload.cardTokenId) {
        throw new ConflictException({
          message: 'Error saving subscription',
          error: 'card_token_id is required',
        });
      }

      return this.mercadopagoSubscriptionService.initSubscription(
        requester,
        plan,
        payload.cardTokenId as string,
        payload.email,
      );
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      const detail = error instanceof Error ? error.message : 'Unknown error';
      console.error('[subscription] createProviderSubscription failed:', detail);
      throw new ConflictException({ message: detail, error: detail });
    }
  }

  async getSubscription(
    req: Request,
    subscriptionId: string,
  ): Promise<SubscriptionModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const subscription =
      await this.subscriptionPersistenceService.getSubscriptionDocumentOrFail(
        subscriptionId,
      );

    this.assertSubscriptionOwnerOrAdmin(requester, String(subscription.userId));

    return this.subscriptionPersistenceService.toSubscriptionModel(subscription);
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
    return this.paypalSubscriptionService.confirmPaypalSubscription(
      req,
      providerSubscriptionId,
    );
  }

  async confirmMercadoPagoSubscription(
    req: Request,
    providerSubscriptionId: string,
  ): Promise<SubscriptionModel> {
    return this.mercadopagoSubscriptionService.confirmMercadoPagoSubscription(
      req,
      providerSubscriptionId,
    );
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
}
