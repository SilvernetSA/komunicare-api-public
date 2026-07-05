import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  @IsOptional()
  @IsString()
  id?: string;

  [key: string]: unknown;
}
