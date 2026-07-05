import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupPasswordDto {
  @ApiProperty({ example: 'activation-token' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'newSecret123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
