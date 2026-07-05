import { Module } from '@nestjs/common';

import { CommonModule } from '../../common/common.module';
import { PlanController } from './plan.controller';
import { PlanRepository } from './plan.repository';
import { PlanService } from './plan.service';

@Module({
  imports: [CommonModule],
  controllers: [PlanController],
  providers: [PlanService, PlanRepository],
  exports: [PlanRepository],
})
export class PlanModule {}
