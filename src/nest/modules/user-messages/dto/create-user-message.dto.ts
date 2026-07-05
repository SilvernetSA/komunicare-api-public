import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserMessageDto {
  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: 'Necesito ayuda' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ example: 'es-AR' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ example: 'general' })
  @IsOptional()
  @IsString()
  category?: string;
}
