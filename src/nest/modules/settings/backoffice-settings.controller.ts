import { Body, Controller, Get, Put, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import {
  ApiErrorResponses,
  ApiFreeformObjectBody,
  ApiSuccessResponse,
} from '../../common/swagger.decorators';
import { IdQueryDto } from './dto/id-query.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsModel } from './models/settings.model';
import { SettingsService } from './settings.service';

@ApiTags('backoffice-settings')
@Controller('backoffice/user/settings')
export class BackofficeSettingsController extends BaseController {
  constructor(private readonly settingsService: SettingsService) {
    super();
  }

  @Get()
  @ApiSuccessResponse(SettingsModel, 'Backoffice settings found')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'internal')
  getSettingsByUserId(
    @Req() req: Request,
    @Query() query: IdQueryDto,
  ): Promise<SettingsModel> {
    return this.executeRequest(
      'getSettingsByUserId',
      () => this.settingsService.getSettingsByUserIdBackoffice(req, query.id),
      'Could not load backoffice settings',
    );
  }

  @Put()
  @ApiFreeformObjectBody('Settings payload', {
    speech: { voiceURI: 'es-AR-ElenaNeural', pitch: 1, rate: 1 },
    navigation: { vocalizeFolders: true },
  })
  @ApiSuccessResponse(SettingsModel, 'Backoffice settings updated')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'conflict', 'internal')
  updateSettings(
    @Req() req: Request,
    @Query() query: IdQueryDto,
    @Body() payload: Record<string, unknown> & UpdateSettingsDto,
  ): Promise<SettingsModel> {
    return this.executeRequest(
      'updateSettings',
      () =>
        this.settingsService.updateSettingsBackoffice(
          req,
          query.id,
          payload,
        ),
      'Could not update backoffice settings',
    );
  }
}
