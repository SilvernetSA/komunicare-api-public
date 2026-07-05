import { Injectable } from '@nestjs/common';

import { RequestQuery } from '../../common/pagination.util';
import { getORQuery } from '../../common/query.util';
import { ContentPersistenceService } from '../../common/content-persistence.service';
import { LanguageListResponse, LanguageModel } from './models/language.model';

@Injectable()
export class LanguagesRepository {
  constructor(
    private readonly contentPersistence: ContentPersistenceService,
  ) {}

  async paginateByLang(lang?: string): Promise<LanguageListResponse> {
    const searchFields = ['locale'];
    const query = lang && lang.length ? getORQuery(searchFields, lang, true) : {};

    return (await this.contentPersistence.paginateLanguages(
      query,
      ({ lang } as unknown) as RequestQuery,
    )) as unknown as LanguageListResponse;
  }

  async findByLocaleMatch(lang: string): Promise<LanguageModel | null> {
    const language = await this.contentPersistence.findLanguageByLocaleMatch(lang);

    if (!language) {
      return null;
    }

    return language.toJSON ? (language.toJSON() as LanguageModel) : (language as LanguageModel);
  }
}
