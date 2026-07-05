import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListBoardsByEmailDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ example: '-_id' })
  @IsOptional()
  @IsString()
  sort?: string = '-_id';

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  search?: string = '';

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  order?: string = '';
}
