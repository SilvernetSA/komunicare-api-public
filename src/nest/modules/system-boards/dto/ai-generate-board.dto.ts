import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AiGenerateBoardDto {
  @ApiProperty({ description: 'Tema del tablero, ej: "comidas", "rutinas de higiene"' })
  @IsString()
  prompt!: string;

  @ApiPropertyOptional({ default: 20, minimum: 6, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(60)
  totalTiles?: number;

  @ApiPropertyOptional({ default: 'es' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ enum: ['arasaac', 'global-symbols'], default: 'arasaac' })
  @IsOptional()
  @IsEnum(['arasaac', 'global-symbols'])
  symbolSet?: 'arasaac' | 'global-symbols';
}
