import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessResponse } from '../../common/swagger.decorators';
import { LocationModel } from './models/location.model';
import { LocationService } from './location.service';

@ApiTags('location')
@Controller('location')
export class LocationController extends BaseController {
  constructor(private readonly locationService: LocationService) {
    super();
  }

  @Get()
  @ApiSuccessResponse(LocationModel, 'Resolved location')
  @ApiErrorResponses('internal')
  getLocation(@Req() req: Request): Promise<LocationModel> {
    return this.executeRequest(
      'getLocation',
      () => this.locationService.getLocation(req.ip || ''),
      'Could not resolve location',
    );
  }
}
