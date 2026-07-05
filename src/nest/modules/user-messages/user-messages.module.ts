import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { UserMessagesController } from './user-messages.controller';
import { UserMessagesRepository } from './user-messages.repository';
import { UserMessagesService } from './user-messages.service';

@Module({
  imports: [CommonModule],
  controllers: [UserMessagesController],
  providers: [UserMessagesService, UserMessagesRepository],
})
export class UserMessagesModule {}
