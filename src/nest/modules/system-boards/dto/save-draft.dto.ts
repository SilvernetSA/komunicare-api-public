import { IsOptional } from 'class-validator';

export class SaveDraftDto {
  @IsOptional()
  boardChanges?: Record<string, any>;

  @IsOptional()
  newBoards?: any[];
}
