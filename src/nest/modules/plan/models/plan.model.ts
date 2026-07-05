import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanModel {
  [key: string]: unknown;

  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  id?: string;

  @ApiProperty({ example: 'Plan mensual' })
  name!: string;

  @ApiPropertyOptional({ example: 'Plan principal de Komunicare' })
  description?: string;

  @ApiProperty({ enum: ['paypal', 'mercadopago'], example: 'paypal' })
  provider!: 'paypal' | 'mercadopago';

  @ApiProperty({ example: 'P-1234567890' })
  planId!: string;

  @ApiProperty({ example: 'MONTH' })
  interval!: string;

  @ApiProperty({ example: 1 })
  intervalCount!: number;

  @ApiProperty({ example: 9.99 })
  price!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;
}

export class PlanListResponse {
  @ApiProperty({ type: () => PlanModel, isArray: true })
  plans!: PlanModel[];

  @ApiProperty({ example: 3 })
  count!: number;
}
