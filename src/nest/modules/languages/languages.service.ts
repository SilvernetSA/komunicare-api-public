import { Injectable, NotFoundException } from '@nestjs/common';

import { LanguageListResponse, LanguageModel } from './models/language.model';
import { LanguagesRepository } from './languages.repository';

@Injectable()
export class LanguagesService {
  constructor(private readonly languagesRepository: LanguagesRepository) {}

  async listLanguages(lang?: string): Promise<LanguageListResponse> {
    return this.languagesRepository.paginateByLang(lang);
  }

  async getLanguage(lang: string): Promise<LanguageModel> {
    const language = await this.languagesRepository.findByLocaleMatch(lang);

    if (!language) {
      throw new NotFoundException(`Language does not exist. Language: ${lang}`);
    }

    return language;
  }
}
