import {
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'damian@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Damian' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '2026-02-20T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  birthdate?: string;

  @ApiPropertyOptional({ example: 'es-AR' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: {
      country: 'Argentina',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'La Plata',
    },
  })
  @IsOptional()
  @IsObject()
  location?: Record<string, unknown>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFirstLogin?: boolean;

  @ApiPropertyOptional({ example: 'male', enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  gender?: string;
}
