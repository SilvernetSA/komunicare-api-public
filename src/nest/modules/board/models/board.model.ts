import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BoardModel {
  @ApiProperty({ example: 'Tablero Komunicare' })
  name!: string;

  @ApiProperty({ example: 'Komunicare' })
  author!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: false })
  isPublic?: boolean;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    example: [],
  })
  tiles?: unknown[];

  @ApiPropertyOptional({ example: 'medium' })
  cellSize?: string;

  @ApiPropertyOptional({ example: 'es-ES' })
  locale?: string;

  @ApiPropertyOptional({ example: '../logo.svg' })
  caption?: string;

  @ApiPropertyOptional({ example: 'cboard' })
  format?: string;

  @ApiPropertyOptional({ type: String, example: '2026-04-14T10:00:00.000Z' })
  lastEdited?: Date | string;

  @ApiPropertyOptional({ example: 'Tablero principal del usuario' })
  description?: string;

  @ApiPropertyOptional({ example: true })
  isFixed?: boolean;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { rows: 6, columns: 5, order: [] },
  })
  grid?: unknown;

  @ApiPropertyOptional({ example: 'komunicare' })
  id?: string;
}

export class PaginatedBoardModelResponse {
  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;

  @ApiProperty({ example: '-_id' })
  sort!: string;

  @ApiProperty({ example: '' })
  search!: string;

  @ApiProperty({ type: () => BoardModel, isArray: true })
  data!: BoardModel[];
}

export class BoardActionResponse {
  @ApiProperty({ example: 1 })
  success!: number;

  @ApiProperty({ example: 'Mail sent successfully' })
  message!: string;
}

export class CleanupCommunicatorBoardCopiesResultModel {
  @ApiProperty({ example: 12 })
  scannedCommunicators!: number;

  @ApiProperty({ example: 5 })
  cleanedCommunicators!: number;

  @ApiProperty({ example: 5 })
  updatedCommunicators!: number;

  @ApiProperty({ example: 14 })
  deletedBoards!: number;

  @ApiProperty({ example: 14 })
  targetedBoardIds!: number;
}
