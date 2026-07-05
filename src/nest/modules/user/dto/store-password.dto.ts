import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StorePasswordDto {
  @ApiProperty({ example: '6831ef4d3a2b47506a9f61f3' })
  @IsString()
  @IsNotEmpty()
  userid!: string;

  @ApiProperty({ example: 'newSecret123' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ example: 'reset-token' })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({ example: 'activation-url' })
  @IsOptional()
  @IsString()
  url?: string;
}
