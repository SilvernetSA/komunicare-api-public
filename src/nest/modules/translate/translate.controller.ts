import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSchemaSuccessResponse } from '../../common/swagger.decorators';
import { TranslateRequestDto } from './dto/translate-request.dto';
import { TranslateResponseModel } from './models/translate.model';
import { TranslateService } from './translate.service';

@ApiTags('translate')
@Controller('translate')
export class TranslateController extends BaseController {
  constructor(private readonly translateService: TranslateService) {
    super();
  }

  @Post()
  @HttpCode(200)
  @ApiSchemaSuccessResponse(
    {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: { hola: 'hello', gracias: 'thank you' },
    },
    'Translated labels',
  )
  @ApiErrorResponses('badRequest', 'internal')
  translateRequest(
    @Body() payload: TranslateRequestDto,
  ): Promise<TranslateResponseModel> {
    return this.executeRequest(
      'translateRequest',
      () => this.translateService.translateRequest(payload),
      'Could not translate labels',
    );
  }
}
