import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { AppConfigModule } from '../app-config/app-config.module';
import { SubscriberRepository } from '../subscriber/subscriber.repository';
import { MeController } from './me.controller';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [CommonModule, AppConfigModule],
  controllers: [UserController, MeController],
  providers: [UserService, UserRepository, SubscriberRepository],
})
export class UserModule {}
