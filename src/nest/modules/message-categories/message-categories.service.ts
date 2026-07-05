import { Injectable } from '@nestjs/common';

import { MessageCategoryModel } from './models/message-category.model';
import { MessageCategoriesRepository } from './message-categories.repository';

@Injectable()
export class MessageCategoriesService {
  constructor(
    private readonly messageCategoriesRepository: MessageCategoriesRepository,
  ) {}

  async listMessageCategories(): Promise<MessageCategoryModel[]> {
    await this.messageCategoriesRepository.ensureDefaults();
    return this.messageCategoriesRepository.findAllSorted();
  }
}
