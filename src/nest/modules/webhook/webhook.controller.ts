import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import {
  ApiErrorResponses,
  ApiFreeformObjectBody,
  ApiSuccessResponse,
} from '../../common/swagger.decorators';
import { WebhookResponseModel } from './models/webhook.model';
import { WebhookService } from './webhook.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController extends BaseController {
  constructor(private readonly webhookService: WebhookService) {
    super();
  }

  @Post('paypal')
  @HttpCode(200)
  @ApiFreeformObjectBody('PayPal webhook payload', {
    id: 'WH-1234567890',
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
  })
  @ApiSuccessResponse(WebhookResponseModel, 'PayPal webhook processed')
  @ApiErrorResponses('badRequest', 'conflict', 'internal')
  paypalWebhook(
    @Headers() headers: Record<string, string>,
    @Body() payload: any,
  ): Promise<WebhookResponseModel> {
    return this.executeRequest(
      'paypalWebhook',
      () => this.webhookService.handlePaypalWebhook(headers, payload),
      'Could not process PayPal webhook',
    );
  }

  @Post('mercado-pago')
  @HttpCode(200)
  @ApiFreeformObjectBody('Mercado Pago webhook payload', {
    action: 'preapproval.updated',
    data: { id: '2c938084726fca480172750000000000' },
  })
  @ApiSuccessResponse(WebhookResponseModel, 'Mercado Pago webhook processed')
  @ApiErrorResponses('badRequest', 'unauthorized', 'conflict', 'internal')
  mercadoPagoWebhook(
    @Headers() headers: Record<string, string>,
    @Body() payload: any,
    @Req() req: Request,
  ): Promise<WebhookResponseModel> {
    return this.executeRequest(
      'mercadoPagoWebhook',
      () =>
        this.webhookService.handleMercadoPagoWebhook(
          headers,
          payload,
          req.originalUrl,
        ),
      'Could not process Mercado Pago webhook',
    );
  }
}
