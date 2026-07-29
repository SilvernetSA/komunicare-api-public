import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListUsersQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;

  @ApiPropertyOptional({ example: '-_id' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  order?: string;

  @ApiPropertyOptional({ example: 'Damian' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'admin', description: 'Filter by role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'true', description: 'true = created internally, false = self-registered' })
  @IsOptional()
  @IsString()
  isByBackOffice?: string;
}
