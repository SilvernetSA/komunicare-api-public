import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LegacyUserReferenceQueryDto {
  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  @IsOptional()
  @IsString()
  user?: string;
}
