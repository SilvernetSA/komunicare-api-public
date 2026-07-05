import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscriptionModel {
  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  id?: string;

  @ApiProperty({ example: 'I-1234567890' })
  subscriptionId!: string;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: 'paypal' })
  platform!: string;

  @ApiProperty({ example: 'P-1234567890' })
  planId!: string;

  @ApiProperty({ example: '6831ef4d3a2b47506a9f61f3' })
  userId!: string;

  @ApiPropertyOptional({ type: String, example: '2026-12-31T23:59:59.000Z' })
  expirationDate?: string | Date;

  @ApiPropertyOptional({ type: String, example: '2026-04-14T10:00:00.000Z' })
  createdAt?: string | Date;

  @ApiPropertyOptional({ type: String, example: '2026-04-14T10:00:00.000Z' })
  updatedAt?: string | Date;
}

export class SubscriptionListItem extends SubscriptionModel {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { name: 'Plan mensual', provider: 'paypal' },
  })
  plan!: unknown;
}

export class SubscriptionListResponse {
  @ApiProperty({ type: () => SubscriptionListItem, isArray: true })
  suscriptions!: SubscriptionListItem[];

  @ApiProperty({ example: 1 })
  count!: number;
}

export class CreateProviderSubscriptionResponse {
  @ApiPropertyOptional({ example: 'https://www.mercadopago.com/init-point' })
  init_point?: string;

  @ApiPropertyOptional({ example: 'https://www.paypal.com/checkoutnow?token=...' })
  link?: string;

  @ApiPropertyOptional({ example: '2c938084726fca480172750000000000' })
  subscriptionId?: string;

  @ApiPropertyOptional({ example: 'authorized' })
  status?: string;
}
