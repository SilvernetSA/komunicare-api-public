import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { BackofficeSettingsController } from './backoffice-settings.controller';
import { SettingsController } from './settings.controller';
import { SettingsRepository } from './settings.repository';
import { SettingsService } from './settings.service';

@Module({
  imports: [CommonModule],
  controllers: [SettingsController, BackofficeSettingsController],
  providers: [SettingsService, SettingsRepository],
})
export class SettingsModule {}
