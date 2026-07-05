import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { AiSuggestionsController } from './ai-suggestions.controller';
import { AiSuggestionsService } from './ai-suggestions.service';

@Module({
  imports: [CommonModule],
  controllers: [AiSuggestionsController],
  providers: [AiSuggestionsService],
})
export class AiSuggestionsModule {}
