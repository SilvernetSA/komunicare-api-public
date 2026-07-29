import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AppConfigService } from './app-config.service';

@Module({
  imports: [CommonModule],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
