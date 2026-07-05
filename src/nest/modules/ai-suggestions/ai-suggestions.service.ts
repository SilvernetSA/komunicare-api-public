import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';
import { Request } from 'express';

import { LegacyAuthService } from '../../common/legacy-auth.service';
import { GetSuggestionsDto } from './dto/get-suggestions.dto';
import { GeneratePictogramDto } from './dto/generate-pictogram.dto';

const LAMBDA_URL = process.env.AI_ENGINE_LAMBDA_URL;
const LAMBDA_API_KEY = process.env.AI_ENGINE_LAMBDA_API_KEY;

@Injectable()
export class AiSuggestionsService {
  constructor(private readonly legacyAuthService: LegacyAuthService) {}

  async getSuggestions(req: Request, payload: GetSuggestionsDto) {
    await this.legacyAuthService.getAuthorizedUser(req);

    if (!LAMBDA_URL) {
      throw new InternalServerErrorException({ error: 'AI engine not configured' });
    }

    const { prompt, language = 'es', maxSuggestions = 10, symbolSet, globalSymbolsSymbolSet } = payload;

    if (!prompt?.trim()) {
      throw new BadRequestException({ error: 'prompt is required' });
    }

    try {
      const { data } = await axios.post(
        LAMBDA_URL,
        { prompt, language, maxSuggestions, symbolSet, globalSymbolsSymbolSet },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(LAMBDA_API_KEY ? { 'x-api-key': LAMBDA_API_KEY } : {}),
          },
          timeout: 35_000,
        },
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.error || error?.message;

      if (status === 400) throw new BadRequestException({ error: message });
      throw new InternalServerErrorException({ error: 'AI engine error' });
    }
  }

  async generatePictogram(req: Request, payload: GeneratePictogramDto) {
    await this.legacyAuthService.getAuthorizedUser(req);

    if (!LAMBDA_URL) {
      throw new InternalServerErrorException({ error: 'AI engine not configured' });
    }

    const { concept, customPrompt } = payload;

    if (!concept?.trim()) {
      throw new BadRequestException({ error: 'concept is required' });
    }

    try {
      const { data } = await axios.post(
        LAMBDA_URL,
        { action: 'generate-pictogram', concept, ...(customPrompt ? { customPrompt } : {}) },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(LAMBDA_API_KEY ? { 'x-api-key': LAMBDA_API_KEY } : {}),
          },
          timeout: 65_000,
        },
      );
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.error || error?.message;
      if (status === 400) throw new BadRequestException({ error: message });
      throw new InternalServerErrorException({ error: 'Pictogram generation failed' });
    }
  }
}
