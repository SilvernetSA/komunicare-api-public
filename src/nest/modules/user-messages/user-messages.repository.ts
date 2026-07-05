import { Injectable } from '@nestjs/common';

import { ContentPersistenceService } from '../../common/content-persistence.service';
import { CreateUserMessageDto } from './dto/create-user-message.dto';
import { UpdateUserMessageDto } from './dto/update-user-message.dto';
import { UserMessageModel } from './models/user-message.model';

@Injectable()
export class UserMessagesRepository {
  constructor(
    private readonly contentPersistence: ContentPersistenceService,
  ) {}

  async listByUser(userId: string): Promise<UserMessageModel[]> {
    const messages = await this.contentPersistence.listUserMessagesByUser(userId);
    return messages.map((message: any) => message.toJSON()) as UserMessageModel[];
  }

  create(payload: CreateUserMessageDto & { userId: string }): any {
    return this.contentPersistence.createUserMessage({
      user: payload.userId,
      text: payload.text,
      locale: payload.locale,
      category: payload.category,
    });
  }

  async save(message: any): Promise<UserMessageModel> {
    const savedMessage = await this.contentPersistence.saveUserMessage(message);
    return savedMessage.toJSON() as UserMessageModel;
  }

  async findById(id: string): Promise<any | null> {
    return this.contentPersistence.findUserMessageById(id);
  }

  applyUpdates(message: any, payload: UpdateUserMessageDto): void {
    if (payload.text !== undefined) message.text = payload.text;
    if (payload.locale !== undefined) message.locale = payload.locale;
    if (payload.category !== undefined) message.category = payload.category;
  }

  async deleteById(id: string): Promise<void> {
    await this.contentPersistence.deleteUserMessageById(id);
  }
}
