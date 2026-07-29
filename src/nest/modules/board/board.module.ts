import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { BoardController } from './board.controller';
import { BoardRepository } from './board.repository';
import { BoardService } from './board.service';
import { BoardModerationService } from './services/board-moderation.service';

@Module({
  imports: [CommonModule],
  controllers: [BoardController],
  providers: [BoardService, BoardRepository, BoardModerationService],
  exports: [BoardRepository, BoardService],
})
export class BoardModule {}
