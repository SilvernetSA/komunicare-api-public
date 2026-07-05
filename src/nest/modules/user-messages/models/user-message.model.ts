import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserMessageModel {
  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  id?: string;

  @ApiProperty({ example: '6831ef4d3a2b47506a9f61f3' })
  user!: string;

  @ApiProperty({ example: 'Necesito ayuda' })
  text!: string;

  @ApiPropertyOptional({ example: 'es-AR' })
  locale?: string;

  @ApiPropertyOptional({ example: 'general' })
  category?: string;

  @ApiPropertyOptional({ type: String, example: '2026-04-14T10:00:00.000Z' })
  createdAt?: string | Date;

  @ApiPropertyOptional({ type: String, example: '2026-04-14T10:00:00.000Z' })
  updatedAt?: string | Date;
}
