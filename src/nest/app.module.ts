import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { BoardModule } from './modules/board/board.module';
import { CommunicatorModule } from './modules/communicator/communicator.module';
import { UserModule } from './modules/user/user.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SubscriberModule } from './modules/subscriber/subscriber.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PlanModule } from './modules/plan/plan.module';
import { ProductModule } from './modules/product/product.module';
import { LanguagesModule } from './modules/languages/languages.module';
import { MessageCategoriesModule } from './modules/message-categories/message-categories.module';
import { UserMessagesModule } from './modules/user-messages/user-messages.module';
import { TranslateModule } from './modules/translate/translate.module';
import { LocationModule } from './modules/location/location.module';
import { MediaModule } from './modules/media/media.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { GptModule } from './modules/gpt/gpt.module';
import { SystemBoardsModule } from './modules/system-boards/system-boards.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
      { name: 'send-email', ttl: 60_000, limit: 5 },
    ]),
    BoardModule,
    CommunicatorModule,
    UserModule,
    SettingsModule,
    SubscriberModule,
    SubscriptionModule,
    PlanModule,
    ProductModule,
    LanguagesModule,
    MessageCategoriesModule,
    UserMessagesModule,
    TranslateModule,
    LocationModule,
    MediaModule,
    WebhookModule,
    GptModule,
    SystemBoardsModule,
  ],
})
export class NestAppModule {}
