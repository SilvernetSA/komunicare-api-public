import { Module } from '@nestjs/common';

import { LocationController } from './location.controller';
import { LocationRepository } from './location.repository';
import { LocationService } from './location.service';

@Module({
  controllers: [LocationController],
  providers: [LocationService, LocationRepository],
})
export class LocationModule {}
