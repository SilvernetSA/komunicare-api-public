import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditPhraseDto {
  @ApiProperty({ example: 'quiero agua' })
  @IsString()
  phrase!: string;

  @ApiProperty({ example: 'es-AR' })
  @IsString()
  language!: string;
}
