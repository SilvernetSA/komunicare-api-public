import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { KeyboardSettingsController } from './keyboard-settings.controller';
import { KeyboardSettingsRepository } from './keyboard-settings.repository';
import { KeyboardSettingsService } from './keyboard-settings.service';

@Module({
  imports: [CommonModule],
  controllers: [KeyboardSettingsController],
  providers: [KeyboardSettingsService, KeyboardSettingsRepository],
})
export class KeyboardSettingsModule {}
