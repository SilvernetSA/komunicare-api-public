import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TranslateRequestDto {
  @ApiProperty({ example: 'es' })
  @IsString()
  from!: string;

  @ApiProperty({ example: 'en' })
  @IsString()
  to!: string;

  @ApiProperty({ type: [String], example: ['hola', 'gracias'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  labels!: string[];
}
