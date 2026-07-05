import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProviderSubscriptionDto {
  @ApiProperty({ example: 'P-1234567890' })
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @ApiProperty({ enum: ['paypal', 'mercadopago'], example: 'paypal' })
  @IsString()
  provider!: 'paypal' | 'mercadopago';

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '1234567890abcdef' })
  @IsOptional()
  @IsString()
  cardTokenId?: string;
}
