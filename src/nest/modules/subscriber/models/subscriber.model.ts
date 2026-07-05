import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscriberModel {
  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  id?: string;

  @ApiProperty({ example: '6831ef4d3a2b47506a9f61f3' })
  userId!: string;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiPropertyOptional({ type: String, example: '2026-12-31T23:59:59.000Z' })
  expirationDate?: string | Date;

  @ApiPropertyOptional({ type: String, example: '2026-04-14T10:00:00.000Z' })
  createdAt?: string | Date;

  @ApiPropertyOptional({ type: String, example: '2026-04-14T10:00:00.000Z' })
  updatedAt?: string | Date;
}

export class SubscriberWithUserModel extends SubscriberModel {
  @ApiPropertyOptional({ example: 'María García' })
  name?: string;

  @ApiPropertyOptional({ example: 'maria@ejemplo.com' })
  email?: string;
}

export class SubscriberListResponse {
  @ApiProperty({ type: [SubscriberWithUserModel] })
  data!: SubscriberWithUserModel[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  limit!: number;
}
