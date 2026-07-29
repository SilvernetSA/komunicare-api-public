import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import {
  PaginatedResponse,
  RequestQuery,
} from '../../common/pagination.util';
import { AccountPersistenceService } from '../../common/account-persistence.service';

@Injectable()
export class UserRepository {
  constructor(
    private readonly accountPersistence: AccountPersistenceService,
  ) {}

  async findByEmail(email: string): Promise<any | null> {
    return this.accountPersistence.findUserByEmail(email);
  }

  async findById(id: string): Promise<any | null> {
    return this.accountPersistence.findUserById(id);
  }

  async findByIdWithoutSettings(id: string): Promise<any | null> {
    return this.accountPersistence.findUserByIdWithoutSettings(id);
  }

  async save(user: any, session?: ClientSession): Promise<any> {
    return this.accountPersistence.saveUser(user, session);
  }

  async getOrCreateSettings(user: any): Promise<any> {
    return this.accountPersistence.getOrCreateSettings(user);
  }

  createUser(payload: Record<string, unknown>): any {
    return this.accountPersistence.createUser(payload);
  }

  async authenticate(
    email: string,
    password: string,
    skipBoards = false,
  ): Promise<any> {
    return this.accountPersistence.authenticateUser(email, password, skipBoards);
  }

  createTemporaryUser(payload: Record<string, unknown>): any {
    return this.accountPersistence.createTemporaryUser(payload);
  }

  async findTemporaryUserByEmail(email: string): Promise<any | null> {
    return this.accountPersistence.findTemporaryUserByEmail(email);
  }

  async findTemporaryUserByVerificationUrl(url: string): Promise<any | null> {
    return this.accountPersistence.findTemporaryUserByVerificationUrl(url);
  }

  async deleteTemporaryUserByVerificationUrl(url: string): Promise<any> {
    return this.accountPersistence.deleteTemporaryUserByVerificationUrl(url);
  }

  createResetPassword(payload: Record<string, unknown>): any {
    return this.accountPersistence.createResetPassword(payload);
  }

  async findResetPasswordByUserId(userId: string): Promise<any | null> {
    return this.accountPersistence.findResetPasswordByUserId(userId);
  }

  async findPendingResetPasswordByUserId(userId: string): Promise<any | null> {
    return this.accountPersistence.findPendingResetPasswordByUserId(userId);
  }

  async deleteResetPasswordById(id: string): Promise<any> {
    return this.accountPersistence.deleteResetPasswordById(id);
  }

  async updateUserPassword(userId: string, password: string): Promise<any | null> {
    return this.accountPersistence.updateUserPassword(userId, password);
  }

  async markResetPasswordAsUsed(id: string): Promise<any> {
    return this.accountPersistence.markResetPasswordAsUsed(id);
  }

  async findSettingsDocumentByUserId(userId: string): Promise<any | null> {
    return this.accountPersistence.findSettingsDocumentByUserId(userId);
  }

  createSettings(payload: Record<string, unknown>): any {
    return this.accountPersistence.createSettings(payload);
  }

  async paginatedList(
    query: Record<string, unknown>,
    requestQuery: RequestQuery,
    includeRelations = false,
  ): Promise<PaginatedResponse<any>> {
    return this.accountPersistence.paginatedUsers(
      query,
      requestQuery,
      includeRelations,
    );
  }

  async removeById(id: string): Promise<any | null> {
    return this.accountPersistence.removeUserById(id);
  }

  async removeCommunicatorsByEmail(email: string): Promise<any> {
    return this.accountPersistence.removeCommunicatorsByEmail(email);
  }

  async removeBoardsByEmail(email: string): Promise<any> {
    return this.accountPersistence.removeBoardsByEmail(email);
  }

  async removeSettingsByUserId(userId: string): Promise<any> {
    return this.accountPersistence.removeSettingsByUserId(userId);
  }

  async updateById(id: string, payload: Record<string, unknown>): Promise<any | null> {
    return this.accountPersistence.updateUserById(id, payload);
  }

  async findByEmailWithoutPopulate(email: string): Promise<any | null> {
    return this.accountPersistence.findUserByEmailWithoutPopulate(email);
  }

  async blockById(id: string): Promise<any | null> {
    return this.accountPersistence.blockUserById(id);
  }

  async unblockById(id: string): Promise<any | null> {
    return this.accountPersistence.unblockUserById(id);
  }
}
