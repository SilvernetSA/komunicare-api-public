import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommunicatorDefaultBoardIncluded {
  @ApiProperty({ example: 'komunicare' })
  nameOnJSON!: string;

  @ApiProperty({ example: 'komunicare' })
  homeBoard!: string;
}

export class CommunicatorModel {
  @ApiProperty({ example: 'Tablero Komunicare' })
  name!: string;

  @ApiProperty({ example: 'Komunicare' })
  author!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Comunicador principal del usuario' })
  description?: string;

  @ApiProperty({ example: 'komunicare' })
  rootBoard!: string;

  @ApiProperty({ type: String, isArray: true, example: ['root', 'komunicare'] })
  boards!: string[];

  @ApiPropertyOptional({
    type: () => CommunicatorDefaultBoardIncluded,
    isArray: true,
  })
  defaultBoardsIncluded?: CommunicatorDefaultBoardIncluded[];

  @ApiPropertyOptional({
    example: 'komunicare',
    enum: ['komunicare', 'cboard', 'universal_core'],
  })
  copySource?: string;

  @ApiPropertyOptional({ example: '67af7a87b764d6e7efcf2d22' })
  copySourceCommunicatorId?: string;

  @ApiPropertyOptional({ example: '6998822137b29f6a88230445' })
  id?: string;
}

export class CreateCommunicatorResponse {
  @ApiProperty({ example: 1 })
  success!: number;

  @ApiProperty({ example: '6998822137b29f6a88230445' })
  id!: string;

  @ApiProperty({ type: () => CommunicatorModel })
  communicator!: CommunicatorModel;

  @ApiProperty({ example: 'Communicator saved successfully' })
  message!: string;
}

export class PaginatedCommunicatorModelResponse {
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

  @ApiProperty({ type: () => CommunicatorModel, isArray: true })
  data!: CommunicatorModel[];
}
