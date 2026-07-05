import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const translate = require('translate-api');

@Injectable()
export class TranslateRepository {
  async translateLabel(
    label: string,
    payload: { from: string; to: string },
  ): Promise<string> {
    return translate.getText(label, payload);
  }
}
