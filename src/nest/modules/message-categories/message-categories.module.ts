import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { MessageCategoriesController } from './message-categories.controller';
import { MessageCategoriesRepository } from './message-categories.repository';
import { MessageCategoriesService } from './message-categories.service';

@Module({
  imports: [CommonModule],
  controllers: [MessageCategoriesController],
  providers: [MessageCategoriesService, MessageCategoriesRepository],
})
export class MessageCategoriesModule {}
