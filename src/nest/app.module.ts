import { Module } from '@nestjs/common';

import { BoardModule } from './modules/board/board.module';
import { CommunicatorModule } from './modules/communicator/communicator.module';
import { UserModule } from './modules/user/user.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SubscriberModule } from './modules/subscriber/subscriber.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PlanModule } from './modules/plan/plan.module';
import { ProductModule } from './modules/product/product.module';
import { LanguagesModule } from './modules/languages/languages.module';
import { KeyboardSettingsModule } from './modules/keyboard-settings/keyboard-settings.module';
import { MessageCategoriesModule } from './modules/message-categories/message-categories.module';
import { UserMessagesModule } from './modules/user-messages/user-messages.module';
import { TranslateModule } from './modules/translate/translate.module';
import { GptModule } from './modules/gpt/gpt.module';
import { LocationModule } from './modules/location/location.module';
import { MediaModule } from './modules/media/media.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { SystemBoardsModule } from './modules/system-boards/system-boards.module';
import { AiSuggestionsModule } from './modules/ai-suggestions/ai-suggestions.module';

@Module({
  imports: [BoardModule, CommunicatorModule, UserModule, SettingsModule, SubscriberModule, SubscriptionModule, PlanModule, ProductModule, LanguagesModule, KeyboardSettingsModule, MessageCategoriesModule, UserMessagesModule, TranslateModule, GptModule, LocationModule, MediaModule, WebhookModule, SystemBoardsModule, AiSuggestionsModule],
})
export class NestAppModule {}
