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
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import {
  ApiErrorResponses,
  ApiPaginationQuery,
  ApiSuccessResponse,
} from '../../common/swagger.decorators';
import { CheckUserEmailDto } from './dto/check-user-email.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { CreateUserBackofficeDto } from './dto/create-user-backoffice.dto';
import { IdQueryDto } from './dto/id-query.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { UpdateUserBackofficeDto } from './dto/update-user-backoffice.dto';
import {
  EmailAvailabilityResponse,
  PaginatedUsersResponse,
  RemoveUserBackofficeResponse,
  UserActionResponse,
  UserModel,
} from './models/user.model';
import { UserService } from './user.service';

@ApiTags('backoffice-user')
@Controller('backoffice/user')
export class BackofficeUserController extends BaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get()
  @ApiPaginationQuery()
  @ApiSuccessResponse(PaginatedUsersResponse, 'Paginated backoffice user list')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  listUsersBackoffice(
    @Req() req: Request,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponse> {
    return this.executeRequest(
      'listUsersBackoffice',
      () => this.userService.listUsersBackoffice(req, query),
      'Could not list backoffice users',
    );
  }

  @Post()
  @HttpCode(200)
  @ApiSuccessResponse(UserModel, 'Backoffice user created')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'conflict', 'internal')
  createUserBackoffice(
    @Req() req: Request,
    @Body() payload: CreateUserBackofficeDto,
  ): Promise<UserModel> {
    return this.executeRequest(
      'createUserBackoffice',
      () => this.userService.createUserBackoffice(req, payload),
      'Could not create backoffice user',
    );
  }

  @Delete()
  @ApiSuccessResponse(RemoveUserBackofficeResponse, 'Backoffice user deleted')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'internal')
  removeUserBackoffice(
    @Req() req: Request,
    @Query() query: IdQueryDto,
  ): Promise<RemoveUserBackofficeResponse> {
    return this.executeRequest(
      'removeUserBackoffice',
      () => this.userService.removeUserBackoffice(req, query.id),
      'Could not remove backoffice user',
    );
  }

  @Put(':id')
  @ApiSuccessResponse(UserModel, 'Backoffice user updated')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'conflict', 'internal')
  updateUserBackoffice(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() payload: UpdateUserBackofficeDto,
  ): Promise<UserModel> {
    return this.executeRequest(
      'updateUserBackoffice',
      () => this.userService.updateUserBackoffice(req, id, payload),
      'Could not update backoffice user',
    );
  }

  @Post(':id/confirm-email')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'Backoffice email confirmed')
  @ApiErrorResponses('badRequest', 'notFound', 'internal')
  confirmEmailBackoffice(
    @Param('id') id: string,
    @Body() payload: ConfirmEmailDto,
  ): Promise<UserActionResponse> {
    return this.executeRequest(
      'confirmEmailBackoffice',
      () => this.userService.confirmEmailBackoffice(id, payload.token),
      'Could not verify backoffice email token',
    );
  }

  @Post(':id/setup-password')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'Password set and email confirmed')
  @ApiErrorResponses('badRequest', 'notFound', 'internal')
  setupPasswordBackoffice(
    @Param('id') id: string,
    @Body() payload: SetupPasswordDto,
  ): Promise<UserActionResponse> {
    return this.executeRequest(
      'setupPasswordBackoffice',
      () => this.userService.setupPasswordBackoffice(id, payload),
      'Could not set up backoffice password',
    );
  }

  @Post(':id/resend-confirm-email')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'Backoffice verification email resent')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'internal')
  resendConfirmEmailBackoffice(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserActionResponse> {
    return this.executeRequest(
      'resendConfirmEmailBackoffice',
      () => this.userService.resendConfirmEmailBackoffice(req, id),
      'Could not resend backoffice confirmation email',
    );
  }

  @Get('check-email')
  @ApiSuccessResponse(EmailAvailabilityResponse, 'Backoffice email availability')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'internal')
  checkUserEmailBackoffice(
    @Req() req: Request,
    @Query() query: CheckUserEmailDto,
  ): Promise<EmailAvailabilityResponse> {
    return this.executeRequest(
      'checkUserEmailBackoffice',
      () => this.userService.checkUserEmailBackoffice(req, query.email),
      'Could not check backoffice email availability',
    );
  }



  /** Reenviar email de confirmación a un therapist */
  @Post(':id/resend-confirm-email')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'Confirmation email resent')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'internal')
  resendConfirmEmail(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserActionResponse> {
    return this.executeRequest(
      'resendConfirmEmail',
      () => this.userService.resendTherapistConfirmEmail(req, id),
      'Could not resend confirmation email',
    );
  }

  @Post(':id/block')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'User blocked')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  blockUserBackoffice(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserActionResponse> {
    return this.executeRequest(
      'blockUserBackoffice',
      () => this.userService.blockUserBackoffice(req, id),
      'Could not block user',
    );
  }

  @Post(':id/unblock')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'User unblocked')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  unblockUserBackoffice(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserActionResponse> {
    return this.executeRequest(
      'unblockUserBackoffice',
      () => this.userService.unblockUserBackoffice(req, id),
      'Could not unblock user',
    );
  }
}
