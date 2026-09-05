import { IsOptional, IsString } from 'class-validator';

export class CopyPublicBoardDto {
  @IsString()
  sourceBoardId!: string;

  @IsString()
  communicatorId!: string;

  @IsOptional()
  @IsString()
  destinationBoardId?: string;
}
