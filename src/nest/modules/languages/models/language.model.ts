import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LanguageModel {
  [key: string]: unknown;

  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  id?: string;

  @ApiProperty({ example: 'es-AR' })
  locale!: string;

  @ApiProperty({ example: 'Español (Argentina)' })
  displayName!: string;

  @ApiPropertyOptional({ example: 'default' })
  skin?: string;

  @ApiPropertyOptional({ example: 'default' })
  hair?: string;

  @ApiProperty({ example: false })
  arabic!: boolean;
}

export class LanguageListResponse {
  @ApiProperty({ example: 5 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;

  @ApiPropertyOptional({ example: '-_id' })
  sort?: string;

  @ApiPropertyOptional({ example: '' })
  search?: string;

  @ApiProperty({ type: () => LanguageModel, isArray: true })
  data!: LanguageModel[];
}
