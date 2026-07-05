import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserBackofficeDto {
  @ApiProperty({ example: 'Damian' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 'damian@example.com',
    description:
      'Required unless emailConfirmed is true. If omitted when confirming manually, an internal email is generated.',
  })
  @ValidateIf((_payload, value) =>
    typeof value === 'string' ? value.trim().length > 0 : value != null,
  )
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'secret123',
    description: 'Required when emailConfirmed is true.',
  })
  @ValidateIf((_payload, value) =>
    typeof value === 'string' ? value.trim().length > 0 : value !== undefined,
  )
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  emailConfirmed?: boolean;

  @ApiProperty({ example: 'user' })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiPropertyOptional({ example: 'google' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'es-AR' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiProperty({ enum: ['EYE', 'POINTER', 'STATIC'], example: 'EYE' })
  @IsString()
  @IsIn(['EYE', 'POINTER', 'STATIC'])
  keyboardInputMode!: string;

  @ApiPropertyOptional({ enum: ['VERTICAL', 'HORIZONTAL'], example: 'HORIZONTAL' })
  @IsOptional()
  @IsString()
  @IsIn(['VERTICAL', 'HORIZONTAL'])
  keyboardDistribution?: string;
}
