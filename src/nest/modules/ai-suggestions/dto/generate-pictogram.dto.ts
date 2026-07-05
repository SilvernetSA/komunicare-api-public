import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePictogramDto {
  @ApiProperty({
    example: 'tomar agua',
    description: 'Simple concept to pictogramize (e.g. "baño", "estar contento", "quiero comer")',
  })
  @IsString()
  concept!: string;

  @ApiPropertyOptional({
    description: 'Optional full prompt override. When provided, replaces the default Komunicare-style template.',
    example: 'Pictograma simple de "quiero tomar agua". Estilo comunicación aumentativa...',
  })
  @IsOptional()
  @IsString()
  customPrompt?: string;
}
