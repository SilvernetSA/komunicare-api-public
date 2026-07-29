import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { BoardModule } from '../board/board.module';
import { CommunicatorController } from './communicator.controller';
import { CommunicatorRepository } from './communicator.repository';
import { CommunicatorService } from './communicator.service';
import { CommunicatorBoardService } from './services/communicator-board.service';

@Module({
  imports: [CommonModule, BoardModule],
  controllers: [CommunicatorController],
  providers: [CommunicatorService, CommunicatorRepository, CommunicatorBoardService],
})
export class CommunicatorModule {}
