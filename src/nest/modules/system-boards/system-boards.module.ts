import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { SystemBoardsController } from './system-boards.controller';
import { SystemBoardsService } from './system-boards.service';

@Module({
  imports: [CommonModule],
  controllers: [SystemBoardsController],
  providers: [SystemBoardsService],
})
export class SystemBoardsModule {}
