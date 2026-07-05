import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendUserEmailDto {
  @ApiProperty({ example: 'support@example.com' })
  @IsEmail()
  to!: string;

  @ApiProperty({ example: 'Consulta' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({ example: '<p>Hola</p>' })
  @IsString()
  @IsNotEmpty()
  html!: string;
}
