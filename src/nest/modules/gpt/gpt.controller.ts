import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessResponse } from '../../common/swagger.decorators';
import { EditPhraseDto } from './dto/edit-phrase.dto';
import { EditPhraseResponseModel } from './gpt.model';
import { GptService } from './gpt.service';

@ApiTags('gpt')
@Controller('gpt')
export class GptController extends BaseController {
  constructor(private readonly gptService: GptService) {
    super();
  }

  @Post('edit')
  @HttpCode(200)
  @ApiOperation({ summary: 'Legacy alias for phrase editing', deprecated: true })
  @ApiSuccessResponse(EditPhraseResponseModel, 'Improved phrase')
  @ApiErrorResponses('badRequest', 'internal')
  editPhraseLegacy(
    @Req() req: Request,
    @Body() payload: EditPhraseDto,
  ): Promise<EditPhraseResponseModel> {
    return this.executeRequest(
      'editPhraseLegacy',
      () => this.gptService.editPhrase(req, payload),
      'Could not edit phrase',
    );
  }

  @Post('edit-phrase')
  @HttpCode(200)
  @ApiSuccessResponse(EditPhraseResponseModel, 'Improved phrase')
  @ApiErrorResponses('badRequest', 'internal')
  editPhrase(
    @Req() req: Request,
    @Body() payload: EditPhraseDto,
  ): Promise<EditPhraseResponseModel> {
    return this.executeRequest(
      'editPhrase',
      () => this.gptService.editPhrase(req, payload),
      'Could not edit phrase',
    );
  }
}
