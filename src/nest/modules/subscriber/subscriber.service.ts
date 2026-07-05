import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { AccountPersistenceService } from '../../common/account-persistence.service';
import { BillingPersistenceService } from '../../common/billing-persistence.service';
import { LegacyAuthService } from '../../common/legacy-auth.service';
import { SubscriberListResponse, SubscriberModel } from './models/subscriber.model';
import { SubscriberRepository } from './subscriber.repository';

@Injectable()
export class SubscriberService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly billingPersistenceService: BillingPersistenceService,
    private readonly accountPersistence: AccountPersistenceService,
  ) {}

  async listSubscribers(
    req: Request,
    page = 1,
    limit = 50,
    status?: string,
  ): Promise<SubscriberListResponse> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const isAdmin = Boolean(requester.isAdmin || requester.role === 'admin');
    if (!isAdmin) {
      throw new UnauthorizedException({ message: 'Admin access required.' });
    }

    const EXCLUDED_ROLES = new Set(['admin', 'therapist']);

    // Fetch a broader set to account for filtering after user join
    const fetchLimit = limit * 3;
    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = { $regex: `^${status}$`, $options: 'i' };

    let allData: any[] = [];
    let fetchPage = 1;
    let total = 0;

    // Paginate through subscribers until we have enough valid ones
    while (allData.length < page * limit) {
      const skip = (fetchPage - 1) * fetchLimit;
      const { data: batch, total: batchTotal } = await this.subscriberRepository.findAll(
        filter,
        skip,
        fetchLimit,
      );
      total = batchTotal;

      if (batch.length === 0) break;

      const rawList = batch.map((s: any) => (s.toJSON ? s.toJSON() : s));
      const userIds = rawList.map((s: any) => String(s.userId));
      const users = await this.accountPersistence.findUsersByIds(userIds);

      const userMap = new Map<string, any>();
      for (const u of users) {
        const id = String(u._id);
        if (!EXCLUDED_ROLES.has(u.role) && !u.isByBackOffice) {
          userMap.set(id, u);
        }
      }

      for (const sub of rawList) {
        const user = userMap.get(String(sub.userId));
        if (user) {
          allData.push({
            ...sub,
            status: String(sub.status || '').toLowerCase(),
            name: user.name || '',
            email: user.email || '',
          });
        }
      }

      if (rawList.length < fetchLimit) break;
      fetchPage++;
    }

    const startIdx = (page - 1) * limit;
    const pageData = allData.slice(startIdx, startIdx + limit);

    return {
      data: pageData,
      total: allData.length,
      page,
      limit,
    };
  }

  async getSubscriber(req: Request, userId: string): Promise<SubscriberModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const isAdmin = Boolean(requester.isAdmin || requester.role === 'admin');
    const requesterId = String(requester.id || requester._id || '');
    const isSameUser = requesterId === String(userId);

    if (!isAdmin && !isSameUser) {
      throw new UnauthorizedException({
        message: 'Error getting subscriber',
        error: 'Unauthorized request',
      });
    }

    return this.reviewSubscriber(userId);
  }

  async cancelSubscription(req: Request, userId: string): Promise<SubscriberModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const isAdmin = Boolean(requester.isAdmin || requester.role === 'admin');
    const requesterId = String(requester.id || requester._id || '');
    const isSameUser = requesterId === String(userId);

    if (!isAdmin && !isSameUser) {
      throw new UnauthorizedException({ message: 'Not authorized.' });
    }

    const subscriber = await this.subscriberRepository.findByUserId(userId);
    if (!subscriber) {
      throw new NotFoundException(`Subscriber not found for userId: ${userId}`);
    }

    // Marcar como cancelado con fecha — reviewSubscriber respetará este campo
    subscriber.status = 'cancelled';
    (subscriber as any).cancelledAt = new Date();
    await this.subscriberRepository.save(subscriber);

    return subscriber.toJSON() as SubscriberModel;
  }

  private async reviewSubscriber(userId: string): Promise<SubscriberModel> {
    let subscriber = await this.subscriberRepository.findByUserId(userId);

    if (!subscriber) {
      subscriber = this.subscriberRepository.create({
        userId,
        status: 'not_subscribed',
      });
      await this.subscriberRepository.save(subscriber);
    }

    // Si fue cancelado explícitamente, respetar ese estado — no sobreescribir
    const wasCancelled = !!(subscriber as any).cancelledAt;
    if (wasCancelled) {
      // Mantener status cancelled — el acceso sigue hasta expirationDate
      return subscriber.toJSON() as SubscriberModel;
    }

    // Recalcular status solo si no fue cancelado
    if (subscriber.expirationDate) {
      const now = new Date();
      const endDate = new Date(subscriber.expirationDate);
      const currentStatus = String(subscriber.status || 'not_subscribed').toLowerCase();
      let nextStatus = currentStatus;

      const activeSubscriptions =
        await this.billingPersistenceService.findActiveSubscriptionsByUserId(userId);
      const hasActivePaidSubscription = activeSubscriptions.length > 0;

      if (!hasActivePaidSubscription) {
        nextStatus = 'not_subscribed';
      } else if (endDate <= now) {
        nextStatus = 'not_subscribed';
      } else if (currentStatus === 'not_subscribed') {
        nextStatus = 'active';
      }

      if (nextStatus !== currentStatus) {
        subscriber.status = nextStatus;
        await this.subscriberRepository.save(subscriber);
      }
    }

    return subscriber.toJSON() as SubscriberModel;
  }
}
