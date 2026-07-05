import { Module } from '@nestjs/common';

import { TranslateController } from './translate.controller';
import { TranslateRepository } from './translate.repository';
import { TranslateService } from './translate.service';

@Module({
  controllers: [TranslateController],
  providers: [TranslateService, TranslateRepository],
})
export class TranslateModule {}
