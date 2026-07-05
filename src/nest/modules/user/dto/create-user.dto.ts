import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Damian' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'damian@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ example: 'male', enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  gender?: string;
}
