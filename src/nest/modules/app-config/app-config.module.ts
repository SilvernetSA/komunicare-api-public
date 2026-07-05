import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';

@Module({
  imports: [CommonModule],
  controllers: [AppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
