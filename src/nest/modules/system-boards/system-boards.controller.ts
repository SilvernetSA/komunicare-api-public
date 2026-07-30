import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { BaseController } from '../../common/base.controller';
import { ApiSuccessResponse } from '../../common/swagger.decorators';
import { SystemBoardsService } from './system-boards.service';

@ApiTags('backoffice-system-boards')
@Controller('backoffice/system-boards')
export class SystemBoardsController extends BaseController {
  constructor(private readonly service: SystemBoardsService) {
    super();
  }

  private disablePublicCaching(response: Response) {
    response.setHeader(
      'Cache-Control',
      'private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    );
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    response.setHeader('Surrogate-Control', 'no-store');
  }

  @Get('public/communicators')
  @ApiSuccessResponse(Object, 'System communicators (public)')
  getPublicCommunicators(@Res({ passthrough: true }) response: Response) {
    this.disablePublicCaching(response);
    return this.executeRequest(
      'getPublicCommunicators',
      () => this.service.getCommunicators(),
      'Could not load communicators',
    );
  }

  @Get('public/boards')
  @ApiSuccessResponse(Object, 'All system boards (public)')
  getPublicBoards(@Res({ passthrough: true }) response: Response) {
    this.disablePublicCaching(response);
    return this.executeRequest(
      'getPublicBoards',
      () => this.service.getAllSystemBoards(),
      'Could not load system boards',
    );
  }
}
