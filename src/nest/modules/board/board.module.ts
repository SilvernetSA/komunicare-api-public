import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { BoardController } from './board.controller';
import { BoardRepository } from './board.repository';
import { BoardService } from './board.service';

@Module({
  imports: [CommonModule],
  controllers: [BoardController],
  providers: [BoardService, BoardRepository],
})
export class BoardModule {}
