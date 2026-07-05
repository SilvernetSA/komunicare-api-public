import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { CommunicatorController } from './communicator.controller';
import { CommunicatorRepository } from './communicator.repository';
import { CommunicatorService } from './communicator.service';

@Module({
  imports: [CommonModule],
  controllers: [CommunicatorController],
  providers: [CommunicatorService, CommunicatorRepository],
})
export class CommunicatorModule {}
