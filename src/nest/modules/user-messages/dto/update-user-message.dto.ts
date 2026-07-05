import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserMessageDto {
  @ApiPropertyOptional({ example: 'Necesito ayuda' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ example: 'es-AR' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ example: 'general' })
  @IsOptional()
  @IsString()
  category?: string;
}
