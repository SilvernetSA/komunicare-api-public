import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessResponse } from '../../common/swagger.decorators';
import { LanguageListResponse, LanguageModel } from './models/language.model';
import { LanguagesService } from './languages.service';

@ApiTags('languages')
@Controller('languages')
export class LanguagesController extends BaseController {
  constructor(private readonly languagesService: LanguagesService) {
    super();
  }

  @Get()
  @ApiQuery({ name: 'lang', required: false, type: String })
  @ApiSuccessResponse(LanguageListResponse, 'Language list')
  @ApiErrorResponses('notFound', 'internal')
  listLanguages(@Query('lang') lang?: string): Promise<LanguageListResponse> {
    return this.executeRequest(
      'listLanguages',
      () => this.languagesService.listLanguages(lang),
      'Could not list languages',
    );
  }

  @Get(':lang')
  @ApiSuccessResponse(LanguageModel, 'Language found')
  @ApiErrorResponses('notFound', 'internal')
  getLanguage(@Param('lang') lang: string): Promise<LanguageModel> {
    return this.executeRequest(
      'getLanguage',
      () => this.languagesService.getLanguage(lang),
      'Could not load language',
    );
  }
}
