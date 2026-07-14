import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';

import { LegacyAuthService } from '../../common/legacy-auth.service';
import { EditPhraseDto } from './dto/edit-phrase.dto';
import { GptRepository } from './gpt.repository';
import { EditPhraseResponseModel } from './gpt.model';

function sanitizePhrase(phrase: string): string {
  return phrase.replace(/['"]+/g, '');
}

@Injectable()
export class GptService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly gptRepository: GptRepository,
  ) {}

  async editPhrase(
    req: Request,
    payload: EditPhraseDto,
  ): Promise<EditPhraseResponseModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);

    const { phrase, language } = payload;

    if (!phrase) {
      throw new BadRequestException({ error: 'Phrase is required' });
    }

    try {
      const editedPhrase = await this.gptRepository.improvePhrase({
        phrase,
        language,
        gender: user.gender,
      });

      if (editedPhrase) {
        return { phrase: sanitizePhrase(editedPhrase) };
      }
    } catch {
      throw new InternalServerErrorException({ error: 'Internal Server Error' });
    }

    throw new BadRequestException({ error: 'Could not process request' });
  }
}
