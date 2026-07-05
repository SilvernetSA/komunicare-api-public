import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessArrayResponse } from '../../common/swagger.decorators';
import { MessageCategoryModel } from './models/message-category.model';
import { MessageCategoriesService } from './message-categories.service';

@ApiTags('message-categories')
@Controller('message-categories')
export class MessageCategoriesController extends BaseController {
  constructor(
    private readonly messageCategoriesService: MessageCategoriesService,
  ) {
    super();
  }

  @Get()
  @ApiSuccessArrayResponse(MessageCategoryModel, 'Message categories')
  @ApiErrorResponses('internal')
  listMessageCategories(): Promise<MessageCategoryModel[]> {
    return this.executeRequest(
      'listMessageCategories',
      () => this.messageCategoriesService.listMessageCategories(),
      'Could not list message categories',
    );
  }
}
