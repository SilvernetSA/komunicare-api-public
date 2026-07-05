import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckUserEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;
}
