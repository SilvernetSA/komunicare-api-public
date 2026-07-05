import {
  IsEmail,
  IsNotEmptyObject,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BoardReportWhistleblowerDto {
  @ApiPropertyOptional({ example: 'Juan Perez' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'es-ES' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class ReportPublicBoardDto {
  @ApiProperty({ example: 'Tablero ejemplo' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Komunicare' })
  @IsString()
  @IsNotEmpty()
  author!: string;

  @ApiProperty({ example: 'Tablero público con pictogramas' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 'board123' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 'https://komuni.care/board/board123' })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiProperty({ example: 'Contenido inapropiado' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({ type: () => BoardReportWhistleblowerDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => BoardReportWhistleblowerDto)
  whistleblower!: BoardReportWhistleblowerDto;
}
