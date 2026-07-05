import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAppConfigDto {
  @ApiPropertyOptional({ example: 7, description: 'Trial period in days' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  trialDays?: number;
}
