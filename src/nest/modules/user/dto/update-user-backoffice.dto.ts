import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserBackofficeDto {
  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: 'Damian' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'damian@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'secret123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: 'user' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'google' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'es-AR' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ enum: ['EYE', 'POINTER', 'STATIC'], example: 'EYE' })
  @IsOptional()
  @IsString()
  @IsIn(['EYE', 'POINTER', 'STATIC'])
  keyboardInputMode?: string;

  @ApiPropertyOptional({ enum: ['VERTICAL', 'HORIZONTAL'], example: 'HORIZONTAL' })
  @IsOptional()
  @IsString()
  @IsIn(['VERTICAL', 'HORIZONTAL'])
  keyboardDistribution?: string;
}
