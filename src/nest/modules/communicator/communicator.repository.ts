import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';

import {
  type RequestQuery,
} from '../../common/pagination.util';
import { AccountPersistenceService } from '../../common/account-persistence.service';
import { PaginatedCommunicatorModelResponse } from './models/communicator.model';

@Injectable()
export class CommunicatorRepository {
  constructor(
    private readonly accountPersistence: AccountPersistenceService,
  ) {}

  async paginate(
    criteria: Record<string, unknown>,
    query: RequestQuery,
  ): Promise<PaginatedCommunicatorModelResponse> {
    return (await this.accountPersistence.paginateCommunicators(
      criteria,
      query,
    )) as unknown as PaginatedCommunicatorModelResponse;
  }

  async findById(id: string): Promise<any | null> {
    return this.accountPersistence.findCommunicatorById(id);
  }

  async findAll(): Promise<any[]> {
    return this.accountPersistence.findAllCommunicators();
  }

  async findOne(criteria: Record<string, unknown>): Promise<any | null> {
    return this.accountPersistence.findOneCommunicator(criteria);
  }

  async findMany(criteria: Record<string, unknown>): Promise<any[]> {
    return this.accountPersistence.findCommunicators(criteria);
  }

  create(payload: Record<string, any>): any {
    return this.accountPersistence.createCommunicator(payload);
  }

  async save(communicator: any, session?: ClientSession): Promise<any> {
    return this.accountPersistence.saveCommunicator(communicator, session);
  }

  async deleteById(id: string): Promise<void> {
    await this.accountPersistence.deleteCommunicatorById(id);
  }

  async deleteByIds(ids: string[]): Promise<void> {
    await this.accountPersistence.deleteCommunicatorsByIds(ids);
  }
}
