import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessResponse } from '../../common/swagger.decorators';
import { LegacyAuthService } from '../../common/legacy-auth.service';
import { UpdateAppConfigDto } from './dto/update-app-config.dto';
import { AppConfigService } from './app-config.service';

@ApiTags('backoffice-app-config')
@Controller('backoffice/app-config')
export class AppConfigController extends BaseController {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly legacyAuthService: LegacyAuthService,
  ) {
    super();
  }

  @Get()
  @ApiSuccessResponse(Object, 'App config')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  async getConfig(@Req() req: Request) {
    await this.assertAdmin(req);
    return this.executeRequest('getConfig', () => this.appConfigService.getConfig(), 'Could not get app config');
  }

  @Put()
  @ApiSuccessResponse(Object, 'App config updated')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  async updateConfig(@Req() req: Request, @Body() payload: UpdateAppConfigDto) {
    await this.assertAdmin(req);
    return this.executeRequest('updateConfig', () => this.appConfigService.updateConfig(payload), 'Could not update app config');
  }

  private async assertAdmin(req: Request) {
    const user = await this.legacyAuthService.getAuthorizedUser(req) as any;
    if (!user.isAdmin && user.role !== 'admin') {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException('Not authorized.');
    }
  }
}
