import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import {
  PaginatedResponse,
  RequestQuery,
  paginatedResponse,
} from './pagination.util';
import { BoardPersistenceEntity } from './models/board.persistence-model';
import { CommunicatorPersistenceEntity } from './models/communicator.persistence-model';
import { ResetPasswordPersistenceModel } from './models/reset-password.persistence-model';
import { SettingsPersistenceModel } from './models/settings.persistence-model';
import { TemporaryUserPersistenceModel } from './models/temporary-user.persistence-model';
import { UserPersistenceEntity } from './models/user.persistence-model';

@Injectable()
export class AccountPersistenceService {
  async paginateBoards(
    query: Record<string, unknown>,
    requestQuery: RequestQuery,
  ): Promise<PaginatedResponse<any>> {
    return paginatedResponse(BoardPersistenceEntity as any, { query }, requestQuery);
  }

  async findBoardById(id: string): Promise<any | null> {
    return BoardPersistenceEntity.findById(id).exec();
  }

  createBoard(payload: Record<string, unknown>): any {
    return new BoardPersistenceEntity(payload);
  }

  async saveBoard(board: any): Promise<any> {
    return board.save();
  }

  async deleteBoardById(id: string): Promise<void> {
    await BoardPersistenceEntity.findByIdAndDelete(id).exec();
  }

  async findFixedBoardIds(): Promise<string[]> {
    const fixedBoards = await BoardPersistenceEntity.collection
      .find({ isFixed: true })
      .project({ _id: 1 })
      .toArray();

    return fixedBoards
      .map((board: { _id: unknown }) => {
        const boardId = board?._id;
        return typeof boardId === 'string' ? boardId : String(boardId || '');
      })
      .filter((boardId: string) => Boolean(boardId));
  }

  async deleteBoardsByIds(boardIds: string[]): Promise<number> {
    if (!boardIds.length) {
      return 0;
    }

    const deleteResult = await BoardPersistenceEntity.collection.deleteMany({
      _id: {
        $in: boardIds.map((boardId: string) =>
          Types.ObjectId.isValid(boardId)
            ? new Types.ObjectId(boardId)
            : boardId,
        ),
      },
    });

    return Number(deleteResult?.deletedCount || deleteResult?.result?.n || 0);
  }

  async paginateCommunicators(
    query: Record<string, unknown>,
    requestQuery: RequestQuery,
  ): Promise<PaginatedResponse<any>> {
    return paginatedResponse(
      CommunicatorPersistenceEntity as any,
      { query },
      requestQuery,
    );
  }

  async findCommunicatorById(id: string): Promise<any | null> {
    return CommunicatorPersistenceEntity.findById(id).exec();
  }

  async findAllCommunicators(): Promise<any[]> {
    return CommunicatorPersistenceEntity.find({}).exec();
  }

  async findCommunicators(
    criteria: Record<string, unknown>,
  ): Promise<any[]> {
    return CommunicatorPersistenceEntity.find(criteria).exec();
  }

  async findOneCommunicator(
    criteria: Record<string, unknown>,
  ): Promise<any | null> {
    return CommunicatorPersistenceEntity.findOne(criteria).exec();
  }

  createCommunicator(payload: Record<string, unknown>): any {
    return new CommunicatorPersistenceEntity(payload);
  }

  async saveCommunicator(communicator: any): Promise<any> {
    return communicator.save();
  }

  async deleteCommunicatorById(id: string): Promise<void> {
    await CommunicatorPersistenceEntity.findByIdAndDelete(id).exec();
  }

  async deleteCommunicatorsByIds(ids: string[]): Promise<void> {
    if (!ids.length) {
      return;
    }
    await CommunicatorPersistenceEntity.deleteMany({
      _id: {
        $in: ids.map((value) =>
          Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value,
        ),
      },
    }).exec();
  }

  async findUserDocumentById(userId: string): Promise<any | null> {
    return UserPersistenceEntity.findById(userId).exec();
  }

  async findUserByEmail(email: string): Promise<any | null> {
    return UserPersistenceEntity
      .findOne({ email })
      .populate('communicators')
      .populate('boards')
      .populate('settings')
      .exec();
  }

  async findUserById(id: string): Promise<any | null> {
    return UserPersistenceEntity
      .findById(id)
      .populate('communicators')
      .populate('boards')
      .populate('settings')
      .exec();
  }

  async getUserById(id: string): Promise<any | null> {
    return UserPersistenceEntity.getById(id);
  }

  async findUserByIdWithoutSettings(id: string): Promise<any | null> {
    return UserPersistenceEntity
      .findById(id)
      .populate('communicators')
      .populate('boards')
      .exec();
  }

  async saveUser(user: any): Promise<any> {
    return user.save();
  }

  async getOrCreateSettings(user: any): Promise<any> {
    const userId = user?._id || user?.id;

    if (!userId) {
      return null;
    }

    let settings = await SettingsPersistenceModel.findOne({ user: userId }).exec();

    if (!settings) {
      try {
        settings = await new SettingsPersistenceModel({ user: userId }).save();
      } catch {
        settings = await SettingsPersistenceModel.findOne({ user: userId }).exec();
      }
    }

    return settings ? settings.toJSON() : null;
  }

  createUser(payload: Record<string, unknown>): any {
    return new UserPersistenceEntity(payload);
  }

  async authenticateUser(
    email: string,
    password: string,
    skipBoards = false,
  ): Promise<any> {
    return UserPersistenceEntity.authenticate(email, password, skipBoards);
  }

  createTemporaryUser(payload: Record<string, unknown>): any {
    return new TemporaryUserPersistenceModel(payload);
  }

  async findTemporaryUserByEmail(email: string): Promise<any | null> {
    return TemporaryUserPersistenceModel.findOne({ email }).exec();
  }

  async findTemporaryUserByVerificationUrl(url: string): Promise<any | null> {
    return TemporaryUserPersistenceModel
      .findOne({ GENERATED_VERIFYING_URL: url })
      .exec();
  }

  async deleteTemporaryUserByVerificationUrl(url: string): Promise<any> {
    return TemporaryUserPersistenceModel
      .deleteOne({ GENERATED_VERIFYING_URL: url })
      .exec();
  }

  createResetPassword(payload: Record<string, unknown>): any {
    return new ResetPasswordPersistenceModel(payload);
  }

  async findResetPasswordByUserId(userId: string): Promise<any | null> {
    return ResetPasswordPersistenceModel.findOne({ userId }).exec();
  }

  async findPendingResetPasswordByUserId(userId: string): Promise<any | null> {
    return ResetPasswordPersistenceModel.findOne({
      userId,
      status: false,
      resetPasswordExpires: { $gt: new Date() },
    }).exec();
  }

  async deleteResetPasswordById(id: string): Promise<any> {
    return ResetPasswordPersistenceModel.deleteOne({ _id: id }).exec();
  }

  async updateUserPassword(userId: string, password: string): Promise<any | null> {
    return UserPersistenceEntity.findOneAndUpdate({ _id: userId }, { password }).exec();
  }

  async markResetPasswordAsUsed(id: string): Promise<any> {
    return ResetPasswordPersistenceModel
      .findOneAndUpdate({ _id: id }, { status: true })
      .exec();
  }

  async findSettingsDocumentByUserId(userId: string): Promise<any | null> {
    return SettingsPersistenceModel.findOne({ user: userId }).exec();
  }

  createSettings(payload: Record<string, unknown>): any {
    return new SettingsPersistenceModel(payload);
  }

  async updateSettingsById(
    settingsId: string,
    nextSettings: Record<string, unknown>,
  ): Promise<any | null> {
    return SettingsPersistenceModel
      .findByIdAndUpdate(settingsId, nextSettings, { new: true })
      .exec();
  }

  async paginatedUsers(
    query: Record<string, unknown>,
    requestQuery: RequestQuery,
    includeRelations = false,
  ): Promise<PaginatedResponse<any>> {
    return paginatedResponse(
      UserPersistenceEntity as any,
      {
        query,
        populate: includeRelations ? (['communicators', 'boards'] as any) : [],
      },
      requestQuery,
    );
  }

  async removeUserById(id: string): Promise<any | null> {
    return UserPersistenceEntity.findByIdAndRemove(id).exec();
  }

  async removeCommunicatorsByEmail(email: string): Promise<any> {
    return CommunicatorPersistenceEntity.deleteMany({ email }).exec();
  }

  async removeBoardsByEmail(email: string): Promise<any> {
    return BoardPersistenceEntity.deleteMany({ email }).exec();
  }

  async removeSettingsByUserId(userId: string): Promise<any> {
    return SettingsPersistenceModel.deleteMany({ user: userId }).exec();
  }

  async updateUserById(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<any | null> {
    return UserPersistenceEntity.findOneAndUpdate(
      { _id: id },
      payload,
      { new: true },
    ).exec();
  }

  async findUserByEmailWithoutPopulate(email: string): Promise<any | null> {
    return UserPersistenceEntity.findOne({ email }).exec();
  }

  async findUsersByIds(ids: string[]): Promise<any[]> {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    return UserPersistenceEntity
      .find({ _id: { $in: objectIds } })
      .select('_id name email role isAdmin isByBackOffice')
      .lean()
      .exec();
  }
}
