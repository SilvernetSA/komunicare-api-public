import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Komunicare Pro' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Suscripción premium' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 'subscription' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({ example: 'plans' })
  @IsOptional()
  @IsString()
  category?: string;
}
