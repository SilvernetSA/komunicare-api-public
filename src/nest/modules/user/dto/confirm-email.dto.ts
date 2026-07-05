import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmEmailDto {
  @ApiProperty({ example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
