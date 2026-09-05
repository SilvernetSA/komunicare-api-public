import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateCommunicatorBoardDto {
  @ApiProperty({ example: 'My new board' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  tiles?: unknown[];

  @ApiPropertyOptional({ example: 'es-ES' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ example: 'medium' })
  @IsOptional()
  @IsString()
  cellSize?: string;
}
