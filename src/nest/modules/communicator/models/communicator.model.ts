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

  @ApiPropertyOptional({ example: false })
  isPublic?: boolean;

  @ApiPropertyOptional({ example: '67af7a87b764d6e7efcf2d22' })
  publicSourceId?: string;

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
    enum: ['komunicare'],
  })
  copySource?: string;

  @ApiPropertyOptional({ example: '67af7a87b764d6e7efcf2d22' })
  copySourceCommunicatorId?: string;

  @ApiPropertyOptional({ example: '6998822137b29f6a88230445' })
  id?: string;

  @ApiPropertyOptional({ example: false })
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 4 })
  version?: number;

  @ApiPropertyOptional({ example: 3 })
  sourceVersion?: number;
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

export class PublicCommunicatorReportWhistleblowerModel {
  @ApiPropertyOptional({ example: 'Juan Perez' })
  name?: string;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'es-AR' })
  language?: string;
}

export class PublicCommunicatorReportModel {
  @ApiProperty({ example: '686d1b28f8de287278f6bc11' })
  id!: string;

  @ApiProperty({ example: '686d1b28f8de287278f6bc10' })
  communicatorId!: string;

  @ApiProperty({ example: 'Communicator Komunicare' })
  communicatorName!: string;

  @ApiProperty({ example: 'Komunicare' })
  author!: string;

  @ApiProperty({ example: 'owner@example.com' })
  ownerEmail!: string;

  @ApiProperty({ example: 'Contenido inapropiado' })
  reason!: string;

  @ApiProperty({ example: 'https://komuni.care/communicator/686d1b28f8de287278f6bc10' })
  url!: string;

  @ApiProperty({ type: () => PublicCommunicatorReportWhistleblowerModel })
  whistleblower!: PublicCommunicatorReportWhistleblowerModel;

  @ApiProperty({ example: 'pending' })
  status!: string;

  @ApiPropertyOptional({ example: 'Reviewed by moderation team' })
  adminComment?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: {
      description: 'Public communicator with food categories',
      isPublic: true,
    },
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({ type: String, example: '2026-07-08T16:00:00.000Z' })
  createdAt!: Date | string;
}

export class PaginatedPublicCommunicatorReportModelResponse {
  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;

  @ApiProperty({ example: '-createdAt' })
  sort!: string;

  @ApiProperty({ example: '' })
  search!: string;

  @ApiProperty({ type: () => PublicCommunicatorReportModel, isArray: true })
  data!: PublicCommunicatorReportModel[];
}

export class CommunicatorActionResponse {
  @ApiProperty({ example: 1 })
  success!: number;

  @ApiProperty({ example: 'Communicator report saved successfully' })
  message!: string;
}
