import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { AiSuggestionsService } from './ai-suggestions.service';
import { GetSuggestionsDto } from './dto/get-suggestions.dto';
import { GeneratePictogramDto } from './dto/generate-pictogram.dto';

@ApiTags('ai-suggestions')
@Controller('ai-suggestions')
export class AiSuggestionsController extends BaseController {
  constructor(private readonly aiSuggestionsService: AiSuggestionsService) {
    super();
  }

  @Post('suggestions')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate AAC board suggestions using AI' })
  getSuggestions(
    @Req() req: Request,
    @Body() payload: GetSuggestionsDto,
  ) {
    return this.executeRequest(
      'getSuggestions',
      () => this.aiSuggestionsService.getSuggestions(req, payload),
      'Could not generate AI suggestions',
    );
  }

  @Post('generate-pictogram')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate a Komunicare-style AAC pictogram using Azure GPT-Image-1' })
  generatePictogram(
    @Req() req: Request,
    @Body() payload: GeneratePictogramDto,
  ) {
    return this.executeRequest(
      'generatePictogram',
      () => this.aiSuggestionsService.generatePictogram(req, payload),
      'Could not generate pictogram',
    );
  }
}
