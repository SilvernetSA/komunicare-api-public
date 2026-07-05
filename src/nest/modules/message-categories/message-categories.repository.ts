import { Injectable } from '@nestjs/common';

import { ContentPersistenceService } from '../../common/content-persistence.service';
import { MessageCategoryModel } from './models/message-category.model';

@Injectable()
export class MessageCategoriesRepository {
  constructor(
    private readonly contentPersistence: ContentPersistenceService,
  ) {}

  async ensureDefaults(): Promise<void> {
    const count = await this.contentPersistence.countMessageCategories();

    if (count === 0) {
      await this.contentPersistence.insertDefaultMessageCategories();
    }
  }

  async findAllSorted(): Promise<MessageCategoryModel[]> {
    const categories = await this.contentPersistence.findAllMessageCategoriesSorted();

    return categories.map((category: any) =>
      category.toJSON(),
    ) as MessageCategoryModel[];
  }
}
