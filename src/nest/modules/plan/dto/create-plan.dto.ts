import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Plan mensual' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 9.99 })
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @ApiProperty({ enum: ['paypal', 'mercadopago'], example: 'paypal' })
  @IsString()
  provider!: 'paypal' | 'mercadopago';

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({ example: 'MONTH' })
  @IsString()
  @IsNotEmpty()
  intervalUnit!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  intervalCount!: number;
}
