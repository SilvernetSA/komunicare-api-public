import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';

import { LegacyAuthService } from '../../common/legacy-auth.service';
import { EditPhraseDto } from './dto/edit-phrase.dto';
import { GptRepository } from './gpt.repository';
import {
  EditPhraseForKeyboardResponseModel,
  EditPhraseResponseModel,
} from './models/gpt.model';

function sanitizePhrase(phrase: string): string {
  return phrase.replace(/['"]+/g, '');
}

function removeDuplicates(phrases: string[]): string[] {
  return [...new Set(phrases)];
}

function sanitizePhrases(phrase: string): string {
  return phrase
    .replace(/['"]+/g, '')
    .replace(/^\d+\.\s*/gm, '')
    .replace(/^-+\s*/gm, '')
    .replace(/\n/g, ' ')
    .trim();
}

function splitAndSanitizePhrases(phrases: string[]): string[] {
  return phrases
    .flatMap((phrase) => phrase.split('.').map((p) => p.trim()))
    .filter((p) => p.length > 0);
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

  async editPhraseForKeyboard(
    req: Request,
    payload: EditPhraseDto,
  ): Promise<EditPhraseForKeyboardResponseModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);

    const { phrase, language } = payload;

    if (!phrase) {
      throw new BadRequestException({ error: 'Phrase is required' });
    }

    try {
      let editedPhrases = await this.gptRepository.improvePhraseForKeyboard({
        phrase,
        language,
        gender: user.gender,
      });
      editedPhrases = editedPhrases.map((value) => sanitizePhrases(value));
      editedPhrases = splitAndSanitizePhrases(editedPhrases);
      editedPhrases = removeDuplicates(editedPhrases);

      if (editedPhrases.length > 0) {
        return { phrases: editedPhrases };
      }
    } catch {
      throw new InternalServerErrorException({ error: 'Internal Server Error' });
    }

    throw new BadRequestException({ error: 'Could not process request' });
  }
}
