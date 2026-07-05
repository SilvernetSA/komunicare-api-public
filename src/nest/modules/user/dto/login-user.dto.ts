import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({ example: 'damian@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ example: 'MacBook-Pro-Chrome' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  skipBoards?: boolean;
}
