import { Injectable } from '@nestjs/common';

import {
  PaginatedResponse,
  RequestQuery,
  paginatedResponse,
} from './pagination.util';
import { KeyboardSettingsPersistenceModel } from './models/keyboard-settings.persistence-model';
import { LanguagePersistenceModel } from './models/language.persistence-model';
import {
  DEFAULT_MESSAGE_CATEGORIES,
  MessageCategoryPersistenceModel,
} from './models/message-category.persistence-model';
import { UserMessagePersistenceEntity } from './models/user-message.persistence-model';
import { buildKeyboardSettingsUpdate } from './keyboard-settings-update.util';

@Injectable()
export class ContentPersistenceService {
  async paginateLanguages(
    query: Record<string, unknown>,
    requestQuery: RequestQuery,
  ): Promise<PaginatedResponse<any>> {
    return paginatedResponse(
      LanguagePersistenceModel as any,
      {
        query,
        populate: ['communicators', 'boards'] as any,
      },
      requestQuery,
    );
  }

  async findLanguageByLocaleMatch(locale: string): Promise<any | null> {
    return (LanguagePersistenceModel as any).findOne({
      locale: { $regex: locale, $options: 'i' },
    });
  }

  async countMessageCategories(): Promise<number> {
    return (MessageCategoryPersistenceModel as any).estimatedDocumentCount().exec();
  }

  async insertDefaultMessageCategories(): Promise<any> {
    return (MessageCategoryPersistenceModel as any).insertMany(
      DEFAULT_MESSAGE_CATEGORIES,
    );
  }

  async findAllMessageCategoriesSorted(): Promise<any[]> {
    return (MessageCategoryPersistenceModel as any).find().sort({ key: 1 }).exec();
  }

  async listUserMessagesByUser(userId: string): Promise<any[]> {
    return (UserMessagePersistenceEntity as any).listByUser(userId);
  }

  createUserMessage(payload: Record<string, unknown>): any {
    return new (UserMessagePersistenceEntity as any)(payload);
  }

  async saveUserMessage(message: any): Promise<any> {
    return message.save();
  }

  async findUserMessageById(id: string): Promise<any | null> {
    return (UserMessagePersistenceEntity as any).findById(id).exec();
  }

  async deleteUserMessageById(id: string): Promise<void> {
    await (UserMessagePersistenceEntity as any).deleteOne({ _id: id }).exec();
  }

  async findKeyboardSettingsByUserId(userId: string): Promise<any | null> {
    return (KeyboardSettingsPersistenceModel as any).findOne({ user: userId }).exec();
  }

  async upsertKeyboardSettingsByUserId(
    userId: string,
    payload: Record<string, unknown>,
  ): Promise<any | null> {
    const update = buildKeyboardSettingsUpdate(userId, payload);

    return (KeyboardSettingsPersistenceModel as any)
      .findOneAndUpdate(
        { user: userId },
        update,
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();
  }

  async deleteKeyboardSettingsByUserId(userId: string): Promise<void> {
    await (KeyboardSettingsPersistenceModel as any)
      .deleteOne({ user: userId })
      .exec();
  }
}
