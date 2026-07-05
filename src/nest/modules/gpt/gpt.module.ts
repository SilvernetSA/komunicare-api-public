import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { GptController } from './gpt.controller';
import { GptRepository } from './gpt.repository';
import { GptService } from './gpt.service';

@Module({
  imports: [CommonModule],
  controllers: [GptController],
  providers: [GptService, GptRepository],
})
export class GptModule {}
