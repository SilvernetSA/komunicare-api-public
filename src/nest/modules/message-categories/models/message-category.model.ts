import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageCategoryModel {
  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  id?: string;

  @ApiProperty({ example: 'general' })
  key!: string;

  @ApiProperty({ example: 'General' })
  label!: string;
}
