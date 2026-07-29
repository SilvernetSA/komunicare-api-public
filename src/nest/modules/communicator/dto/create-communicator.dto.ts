import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { COMMUNICATOR_COPY_SOURCES } from '../../../common/communicator-copy-source.util';

class DefaultBoardIncludedDto {
  @ApiProperty({ example: 'komunicare' })
  @IsString()
  nameOnJSON!: string;

  @ApiProperty({ example: 'komunicare' })
  @IsString()
  homeBoard!: string;
}

export class CreateCommunicatorDto {
  @ApiProperty({ example: 'Tablero Komunicare' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Komunicare' })
  @IsString()
  author!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  email!: string;

  @ApiPropertyOptional({ example: 'Comunicador principal del usuario' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    example: '67af7a87b764d6e7efcf2d22',
    description: 'ID del comunicador público de origen cuando este registro es una copia personal.',
  })
  @IsOptional()
  @IsString()
  publicSourceId?: string;

  @ApiPropertyOptional({ example: 'https://cdn.komuni.care/media/communicator-image.png' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({ example: 'komunicare' })
  @IsString()
  rootBoard!: string;

  @ApiProperty({ type: [String], example: ['root', 'komunicare', 'jjmlUcQs19'] })
  @IsArray()
  @IsString({ each: true })
  boards!: string[];

  @ApiPropertyOptional({ type: () => [DefaultBoardIncludedDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefaultBoardIncludedDto)
  defaultBoardsIncluded?: DefaultBoardIncludedDto[];

  @ApiPropertyOptional({
    example: 'komunicare',
    enum: COMMUNICATOR_COPY_SOURCES,
    description: 'Origen del comunicador oficial cuando este registro es una copia personal.',
  })
  @IsOptional()
  @IsString()
  @IsIn(COMMUNICATOR_COPY_SOURCES)
  copySource?: string;

  @ApiPropertyOptional({
    example: '67af7a87b764d6e7efcf2d22',
    description: 'ID del comunicador oficial de origen.',
  })
  @IsOptional()
  @IsString()
  copySourceCommunicatorId?: string;
}
