import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';

import { LegacyAuthService } from '../../common/legacy-auth.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PlanListResponse, PlanModel } from './models/plan.model';
import { PlanRepository } from './plan.repository';

@Injectable()
export class PlanService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly planRepository: PlanRepository,
  ) {}

  async createPlan(req: Request, payload: CreatePlanDto): Promise<PlanModel> {
    await this.legacyAuthService.getAuthorizedUser(req);

    let { name, amount, provider, currency, intervalUnit, intervalCount } = payload;

    if (provider !== 'paypal' && provider !== 'mercadopago') {
      throw new InternalServerErrorException({ error: 'Provider not valid.' });
    }

    try {
      let planId = '';

      if (provider === 'paypal') {
        const product = await this.planRepository.findFirstProduct();
        const productId = product?.productId;

        if (!productId) {
          throw new InternalServerErrorException('No se ha creado el producto en Paypal.');
        }

        const paypalPlan = await this.planRepository.createPaypalPlan({
          product_id: productId,
          name,
          description: 'Plan',
          billing_cycles: [
            {
              frequency: { interval_unit: intervalUnit, interval_count: intervalCount },
              tenure_type: 'REGULAR',
              sequence: 1,
              total_cycles: 12,
              pricing_scheme: {
                fixed_price: { value: amount, currency_code: currency },
              },
            },
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee: { value: '0', currency_code: currency },
            setup_fee_failure_action: 'CONTINUE',
            payment_failure_threshold: 3,
          },
        });

        planId = paypalPlan.id;
      }

      if (provider === 'mercadopago') {
        intervalUnit = 'months';

        const mercadoPagoPlan = await this.planRepository.createMercadoPagoPlan({
          reason: name,
          frequency: intervalCount,
          frequency_type: intervalUnit,
          transaction_amount: amount,
          currency_id: currency,
        });

        planId = mercadoPagoPlan.id;
      }

      const plan = this.planRepository.create({
        name,
        description: '',
        provider,
        planId,
        interval: intervalUnit,
        intervalCount,
        price: amount,
        currency,
      });
      const savedPlan = await this.planRepository.save(plan);

      return typeof savedPlan.toJSON === 'function'
        ? (savedPlan.toJSON() as PlanModel)
        : (savedPlan as PlanModel);
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException({
        message: 'Error al guardar el plan',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getPlans(req: Request): Promise<PlanListResponse> {
    await this.legacyAuthService.getAuthorizedUser(req);
    const plans = await this.planRepository.findAll();
    return {
      plans: plans.map((plan) => plan.toJSON() as PlanModel),
      count: plans.length,
    };
  }

  async getPlanById(req: Request, id: string): Promise<PlanModel> {
    await this.legacyAuthService.getAuthorizedUser(req);
    const plan = await this.planRepository.findById(id);
    if (!plan) throw new NotFoundException(`Plan does not exist. Plan Id: ${id}`);
    return plan.toJSON() as PlanModel;
  }

  async updatePlanPrice(
    req: Request,
    id: string,
    payload: { price?: number; currency?: string; name?: string },
  ): Promise<PlanModel> {
    await this.assertAdmin(req);

    const update: Record<string, unknown> = {};
    if (payload.price !== undefined) update.price = payload.price;
    if (payload.currency !== undefined) update.currency = payload.currency;
    if (payload.name !== undefined) update.name = payload.name;

    const updated = await this.planRepository.updateById(id, update);
    if (!updated) throw new NotFoundException(`Plan does not exist. Plan Id: ${id}`);

    return typeof updated.toJSON === 'function'
      ? (updated.toJSON() as PlanModel)
      : (updated as PlanModel);
  }

  async deletePlan(req: Request, id: string): Promise<PlanModel> {
    await this.assertAdmin(req);

    const deleted = await this.planRepository.deleteById(id);
    if (!deleted) throw new NotFoundException(`Plan does not exist. Plan Id: ${id}`);

    return typeof deleted.toJSON === 'function'
      ? (deleted.toJSON() as PlanModel)
      : (deleted as PlanModel);
  }

  private async assertAdmin(req: Request): Promise<void> {
    const user = (await this.legacyAuthService.getAuthorizedUser(req)) as any;
    if (!user.isAdmin && user.role !== 'admin') {
      throw new ForbiddenException('Not authorized.');
    }
  }
}
