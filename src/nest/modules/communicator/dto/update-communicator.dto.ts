import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { COMMUNICATOR_COPY_SOURCES } from '../../../common/communicator-copy-source.util';

class DefaultBoardIncludedDto {
  @ApiPropertyOptional({ example: 'komunicare' })
  @IsString()
  nameOnJSON!: string;

  @ApiPropertyOptional({ example: 'komunicare' })
  @IsString()
  homeBoard!: string;
}

export class UpdateCommunicatorDto {
  @ApiPropertyOptional({ example: 'Tablero Komunicare' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Komunicare' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

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

  @ApiPropertyOptional({ example: 'komunicare' })
  @IsOptional()
  @IsString()
  rootBoard?: string;

  @ApiPropertyOptional({ type: [String], example: ['root', 'komunicare'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boards?: string[];

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

  @ApiPropertyOptional({
    example: true,
    description: 'Marks this communicator as the user\'s default home. Setting to true unsets isDefault on all other communicators for the same email.',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
