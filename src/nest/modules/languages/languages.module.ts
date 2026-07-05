import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { LanguagesController } from './languages.controller';
import { LanguagesRepository } from './languages.repository';
import { LanguagesService } from './languages.service';

@Module({
  imports: [CommonModule],
  controllers: [LanguagesController],
  providers: [LanguagesService, LanguagesRepository],
})
export class LanguagesModule {}
