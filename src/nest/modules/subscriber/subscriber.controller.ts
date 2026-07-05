import { Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessResponse } from '../../common/swagger.decorators';
import { SubscriberListResponse, SubscriberModel } from './models/subscriber.model';
import { SubscriberService } from './subscriber.service';

@ApiTags('subscriber')
@Controller('subscriber')
export class SubscriberController extends BaseController {
  constructor(private readonly subscriberService: SubscriberService) {
    super();
  }

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiSuccessResponse(SubscriberListResponse, 'Subscriber list')
  @ApiErrorResponses('unauthorized', 'internal')
  listSubscribers(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ): Promise<SubscriberListResponse> {
    return this.executeRequest(
      'listSubscribers',
      () =>
        this.subscriberService.listSubscribers(
          req,
          page ? parseInt(page, 10) : 1,
          limit ? parseInt(limit, 10) : 50,
          status,
        ),
      'Could not list subscribers',
    );
  }

  @Get(':userId')
  @ApiSuccessResponse(SubscriberModel, 'Subscriber found')
  @ApiErrorResponses('unauthorized', 'internal')
  getSubscriber(
    @Req() req: Request,
    @Param('userId') userId: string,
  ): Promise<SubscriberModel> {
    return this.executeRequest(
      'getSubscriber',
      () => this.subscriberService.getSubscriber(req, userId),
      'Could not load subscriber',
    );
  }

  @Post(':userId/cancel')
  @HttpCode(200)
  @ApiSuccessResponse(SubscriberModel, 'Subscription cancelled')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  cancelSubscription(
    @Req() req: Request,
    @Param('userId') userId: string,
  ): Promise<SubscriberModel> {
    return this.executeRequest(
      'cancelSubscription',
      () => this.subscriberService.cancelSubscription(req, userId),
      'Could not cancel subscription',
    );
  }
}
