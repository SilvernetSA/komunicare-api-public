import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { BackofficeBoardController } from './backoffice-board.controller';
import { BoardController } from './board.controller';
import { BoardRepository } from './board.repository';
import { BoardService } from './board.service';

@Module({
  imports: [CommonModule],
  controllers: [BoardController, BackofficeBoardController],
  providers: [BoardService, BoardRepository],
  exports: [BoardRepository],
})
export class BoardModule {}
