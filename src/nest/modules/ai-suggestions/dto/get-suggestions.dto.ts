import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetSuggestionsDto {
  @ApiProperty({ example: 'comidas típicas argentinas' })
  @IsString()
  prompt!: string;

  @ApiPropertyOptional({ example: 'es', default: 'es' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 12, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  maxSuggestions?: number;

  @ApiPropertyOptional({ enum: ['arasaac', 'global-symbols'], default: 'arasaac' })
  @IsOptional()
  @IsIn(['arasaac', 'global-symbols'])
  symbolSet?: 'arasaac' | 'global-symbols';

  @ApiPropertyOptional({ example: 'mulberry' })
  @IsOptional()
  @IsString()
  globalSymbolsSymbolSet?: string;
}
