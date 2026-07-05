import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessResponse } from '../../common/swagger.decorators';
import { UserModel } from './models/user.model';
import { UserService } from './user.service';

@ApiTags('me')
@Controller()
export class MeController extends BaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get('me')
  @ApiSuccessResponse(UserModel, 'Current user')
  @ApiErrorResponses('unauthorized', 'internal')
  getMe(@Req() req: Request): Promise<UserModel> {
    return this.executeRequest(
      'getMe',
      () => this.userService.getMe(req),
      'Could not load current user',
    );
  }
}
