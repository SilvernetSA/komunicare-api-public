import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { OptionalIdQueryDto } from '../../common/dto/optional-id-query.dto';
import {
  ApiErrorResponses,
  ApiFreeformObjectBody,
  ApiSuccessResponse,
} from '../../common/swagger.decorators';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsModel } from './models/settings.model';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController extends BaseController {
  constructor(private readonly settingsService: SettingsService) {
    super();
  }

  @Get()
  @ApiSuccessResponse(SettingsModel, 'Current settings')
  @ApiErrorResponses('unauthorized', 'internal')
  getSettings(@Req() req: Request): Promise<SettingsModel> {
    return this.executeRequest(
      'getSettings',
      () => this.settingsService.getSettings(req),
      'Could not load settings',
    );
  }

  @Post()
  @HttpCode(200)
  @ApiFreeformObjectBody('Settings payload', {
    speech: { voiceURI: 'es-AR-ElenaNeural', pitch: 1, rate: 1 },
    navigation: { vocalizeFolders: true },
  })
  @ApiSuccessResponse(SettingsModel, 'Current settings updated')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'conflict', 'internal')
  updateCurrentSettings(
    @Req() req: Request,
    @Query() query: OptionalIdQueryDto,
    @Body() payload: Record<string, unknown> & UpdateSettingsDto,
  ): Promise<SettingsModel> {
    return this.executeRequest(
      'updateCurrentSettings',
      () => this.settingsService.updateCurrentSettings(req, payload, query.id),
      'Could not update current settings',
    );
  }

  @Get('by-user/:id')
  @ApiSuccessResponse(SettingsModel, 'Settings found')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  getSettingsByUserId(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<SettingsModel> {
    return this.executeRequest(
      'getSettingsByUserId',
      () => this.settingsService.getSettingsByUserId(req, id),
      'Could not load settings by user',
    );
  }

  @Put(':id')
  @ApiFreeformObjectBody('Settings payload', {
    speech: { voiceURI: 'es-AR-ElenaNeural', pitch: 1, rate: 1 },
    navigation: { vocalizeFolders: true },
  })
  @ApiSuccessResponse(SettingsModel, 'Settings updated')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'conflict', 'internal')
  updateSettings(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown> & UpdateSettingsDto,
  ): Promise<SettingsModel> {
    return this.executeRequest(
      'updateSettings',
      () => this.settingsService.updateSettings(req, id, payload),
      'Could not update settings',
    );
  }
}
