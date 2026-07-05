import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { LegacyUserReferenceQueryDto } from '../../common/dto/legacy-user-reference-query.dto';
import {
  ApiEmptySuccessResponse,
  ApiErrorResponses,
  ApiFreeformObjectBody,
  ApiSuccessResponse,
} from '../../common/swagger.decorators';
import { KeyboardSettingsModel } from './models/keyboard-settings.model';
import { KeyboardSettingsService } from './keyboard-settings.service';

@ApiTags('keyboard-settings')
@Controller('keyboard-settings')
export class KeyboardSettingsController extends BaseController {
  constructor(private readonly keyboardSettingsService: KeyboardSettingsService) {
    super();
  }

  @Get()
  @ApiOperation({
    summary: 'Legacy keyboard settings lookup using query params',
    deprecated: true,
  })
  @ApiSuccessResponse(KeyboardSettingsModel, 'Keyboard settings found')
  @ApiErrorResponses('badRequest', 'unauthorized', 'notFound', 'internal')
  getKeyboardSettingsLegacy(
    @Req() req: Request,
    @Query() query: LegacyUserReferenceQueryDto,
  ): Promise<KeyboardSettingsModel> {
    return this.executeRequest(
      'getKeyboardSettingsLegacy',
      () =>
        this.keyboardSettingsService.getKeyboardSettings(
          req,
          query.userId || query.user,
        ),
      'Could not load keyboard settings',
    );
  }

  @Get(':userId')
  @ApiSuccessResponse(KeyboardSettingsModel, 'Keyboard settings found')
  @ApiErrorResponses('badRequest', 'unauthorized', 'notFound', 'internal')
  getKeyboardSettings(
    @Req() req: Request,
    @Param('userId') userId: string,
  ): Promise<KeyboardSettingsModel> {
    return this.executeRequest(
      'getKeyboardSettings',
      () => this.keyboardSettingsService.getKeyboardSettings(req, userId),
      'Could not load keyboard settings',
    );
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Legacy keyboard settings upsert using query params',
    deprecated: true,
  })
  @ApiFreeformObjectBody('Keyboard settings payload', {
    inputMode: 'EYE',
    distribution: 'HORIZONTAL',
    keyboardSpeakGesture: 'tap',
  })
  @ApiSuccessResponse(KeyboardSettingsModel, 'Keyboard settings saved')
  @ApiErrorResponses('badRequest', 'unauthorized', 'conflict', 'internal')
  upsertKeyboardSettingsLegacy(
    @Req() req: Request,
    @Query() query: LegacyUserReferenceQueryDto,
    @Body() payload: Record<string, unknown>,
  ): Promise<KeyboardSettingsModel> {
    return this.executeRequest(
      'upsertKeyboardSettingsLegacy',
      () =>
        this.keyboardSettingsService.upsertKeyboardSettings(
          req,
          query.userId || query.user,
          payload,
        ),
      'Could not save keyboard settings',
    );
  }

  @Put(':userId')
  @ApiFreeformObjectBody('Keyboard settings payload', {
    inputMode: 'EYE',
    distribution: 'HORIZONTAL',
    keyboardSpeakGesture: 'tap',
  })
  @ApiSuccessResponse(KeyboardSettingsModel, 'Keyboard settings saved')
  @ApiErrorResponses('badRequest', 'unauthorized', 'conflict', 'internal')
  upsertKeyboardSettings(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<KeyboardSettingsModel> {
    return this.executeRequest(
      'upsertKeyboardSettings',
      () => this.keyboardSettingsService.upsertKeyboardSettings(req, userId, payload),
      'Could not save keyboard settings',
    );
  }

  @Delete(':userId')
  @ApiEmptySuccessResponse('Keyboard settings deleted')
  @ApiErrorResponses('badRequest', 'unauthorized', 'internal')
  deleteKeyboardSettings(
    @Req() req: Request,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.executeRequest(
      'deleteKeyboardSettings',
      () => this.keyboardSettingsService.deleteKeyboardSettings(req, userId),
      'Could not delete keyboard settings',
    );
  }
}
