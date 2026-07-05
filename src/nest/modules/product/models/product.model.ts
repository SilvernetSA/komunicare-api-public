import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductModel {
  [key: string]: unknown;

  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  id?: string;

  @ApiPropertyOptional({ example: 'prod_123' })
  productId?: string;

  @ApiPropertyOptional({ example: 'Komunicare Pro' })
  name?: string;

  @ApiPropertyOptional({ example: 'Suscripción premium' })
  description?: string;

  @ApiPropertyOptional({ example: 'paypal' })
  platform?: string;
}

export class ProductListResponse {
  @ApiProperty({ type: () => ProductModel, isArray: true })
  products!: ProductModel[];

  @ApiProperty({ example: 2 })
  count!: number;
}
