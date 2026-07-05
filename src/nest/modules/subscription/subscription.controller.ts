import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessResponse } from '../../common/swagger.decorators';
import { CreateProviderSubscriptionDto } from './dto/create-provider-subscription.dto';
import {
  CreateProviderSubscriptionResponse,
  SubscriptionListResponse,
  SubscriptionModel,
} from './models/subscription.model';
import { SubscriptionService } from './subscription.service';

@ApiTags('subscription')
@Controller('subscription')
export class SubscriptionController extends BaseController {
  constructor(private readonly subscriptionService: SubscriptionService) {
    super();
  }

  @Post()
  @HttpCode(200)
  @ApiSuccessResponse(
    CreateProviderSubscriptionResponse,
    'Provider subscription initialized',
  )
  @ApiErrorResponses('badRequest', 'unauthorized', 'conflict', 'internal')
  createProviderSubscription(
    @Req() req: Request,
    @Body() payload: CreateProviderSubscriptionDto,
  ): Promise<CreateProviderSubscriptionResponse> {
    return this.executeRequest(
      'createProviderSubscription',
      () => this.subscriptionService.createProviderSubscription(req, payload),
      'Could not create provider subscription',
    );
  }

  @Get('list')
  @ApiOperation({ summary: 'Legacy alias for subscription listing', deprecated: true })
  @ApiSuccessResponse(SubscriptionListResponse, 'Subscription list')
  @ApiErrorResponses('unauthorized', 'internal')
  listSubscriptionsLegacy(
    @Req() req: Request,
  ): Promise<SubscriptionListResponse> {
    return this.executeRequest(
      'listSubscriptionsLegacy',
      () => this.subscriptionService.listSubscriptions(req),
      'Could not list subscriptions',
    );
  }

  @Get()
  @ApiSuccessResponse(SubscriptionListResponse, 'Subscription list')
  @ApiErrorResponses('unauthorized', 'internal')
  listSubscriptions(@Req() req: Request): Promise<SubscriptionListResponse> {
    return this.executeRequest(
      'listSubscriptions',
      () => this.subscriptionService.listSubscriptions(req),
      'Could not list subscriptions',
    );
  }

  @Post('paypal/confirm/:providerSubscriptionId')
  @HttpCode(200)
  @ApiSuccessResponse(SubscriptionModel, 'PayPal subscription confirmed')
  @ApiErrorResponses('unauthorized', 'notFound', 'conflict', 'internal')
  confirmPaypalSubscription(
    @Req() req: Request,
    @Param('providerSubscriptionId') providerSubscriptionId: string,
  ): Promise<SubscriptionModel> {
    return this.executeRequest(
      'confirmPaypalSubscription',
      () =>
        this.subscriptionService.confirmPaypalSubscription(
          req,
          providerSubscriptionId,
        ),
      'Could not confirm PayPal subscription',
    );
  }

  @Post('mercadopago/confirm/:providerSubscriptionId')
  @HttpCode(200)
  @ApiSuccessResponse(SubscriptionModel, 'Mercado Pago subscription confirmed')
  @ApiErrorResponses('unauthorized', 'notFound', 'conflict', 'internal')
  confirmMercadoPagoSubscription(
    @Req() req: Request,
    @Param('providerSubscriptionId') providerSubscriptionId: string,
  ): Promise<SubscriptionModel> {
    return this.executeRequest(
      'confirmMercadoPagoSubscription',
      () =>
        this.subscriptionService.confirmMercadoPagoSubscription(
          req,
          providerSubscriptionId,
        ),
      'Could not confirm Mercado Pago subscription',
    );
  }

  @Post(':subscriptionId/cancel')
  @HttpCode(200)
  @ApiSuccessResponse(SubscriptionModel, 'Subscription cancelled')
  @ApiErrorResponses('unauthorized', 'notFound', 'internal')
  cancelSubscription(
    @Req() req: Request,
    @Param('subscriptionId') subscriptionId: string,
  ): Promise<SubscriptionModel> {
    return this.executeRequest(
      'cancelSubscription',
      () => this.subscriptionService.cancelSubscription(req, subscriptionId),
      'Could not cancel subscription',
    );
  }

  @Post(':subscriptionId/suspend')
  @HttpCode(200)
  @ApiSuccessResponse(SubscriptionModel, 'Subscription suspended')
  @ApiErrorResponses('unauthorized', 'notFound', 'internal')
  suspendSubscription(
    @Req() req: Request,
    @Param('subscriptionId') subscriptionId: string,
  ): Promise<SubscriptionModel> {
    return this.executeRequest(
      'suspendSubscription',
      () => this.subscriptionService.suspendSubscription(req, subscriptionId),
      'Could not suspend subscription',
    );
  }

  @Get(':subscriptionId')
  @ApiSuccessResponse(SubscriptionModel, 'Subscription found')
  @ApiErrorResponses('unauthorized', 'notFound', 'internal')
  getSubscription(
    @Req() req: Request,
    @Param('subscriptionId') subscriptionId: string,
  ): Promise<SubscriptionModel> {
    return this.executeRequest(
      'getSubscription',
      () => this.subscriptionService.getSubscription(req, subscriptionId),
      'Could not load subscription',
    );
  }
}
