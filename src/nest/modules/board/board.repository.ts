import { Injectable } from '@nestjs/common';

import { type RequestQuery } from '../../common/pagination.util';
import { AccountPersistenceService } from '../../common/account-persistence.service';
import { PaginatedBoardModelResponse } from './models/board.model';

@Injectable()
export class BoardRepository {
  constructor(
    private readonly accountPersistence: AccountPersistenceService,
  ) {}

  async paginate(
    criteria: Record<string, unknown>,
    query: RequestQuery,
  ): Promise<PaginatedBoardModelResponse> {
    return (await this.accountPersistence.paginateBoards(
      criteria,
      query,
    )) as unknown as PaginatedBoardModelResponse;
  }

  async findById(id: string): Promise<any | null> {
    return this.accountPersistence.findBoardById(id);
  }

  create(payload: Record<string, any>): any {
    return this.accountPersistence.createBoard(payload);
  }

  async save(board: any): Promise<any> {
    return this.accountPersistence.saveBoard(board);
  }

  async deleteById(id: string): Promise<void> {
    await this.accountPersistence.deleteBoardById(id);
  }
}
