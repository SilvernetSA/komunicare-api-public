import { Injectable } from '@nestjs/common';

import { TranslateRequestDto } from './dto/translate-request.dto';
import { TranslateResponseModel } from './models/translate.model';
import { TranslateRepository } from './translate.repository';

@Injectable()
export class TranslateService {
  constructor(private readonly translateRepository: TranslateRepository) {}

  async translateRequest(
    payload: TranslateRequestDto,
  ): Promise<TranslateResponseModel> {
    const { from, to, labels } = payload;
    const i10nLabels: TranslateResponseModel = {};

    await labels.reduce(async (prev: Promise<void>, current: string) => {
      await prev;

      let translated = current;
      try {
        translated = await this.translateRepository.translateLabel(current, {
          from,
          to,
        });
      } catch {}

      i10nLabels[current] = translated;
    }, Promise.resolve());

    return i10nLabels;
  }
}
