import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SystemBoardModel {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  communicator!: string;

  @ApiPropertyOptional()
  caption?: string;

  @ApiPropertyOptional()
  tiles?: unknown[];

  @ApiPropertyOptional()
  grid?: unknown;

  @ApiPropertyOptional()
  isFixed?: boolean;

  @ApiPropertyOptional()
  locale?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  boardId?: string;
}
