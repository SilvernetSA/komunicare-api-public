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
import {
  ApiErrorResponses,
  ApiPaginationQuery,
  ApiSuccessResponse,
} from '../../common/swagger.decorators';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { SendUserEmailDto } from './dto/send-user-email.dto';
import { StorePasswordDto } from './dto/store-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import {
  AuthenticatedUserModel,
  PaginatedUsersResponse,
  SendUserEmailResponse,
  UserActionResponse,
  UserModel,
} from './models/user.model';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('user')
export class UserController extends BaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get()
  @ApiPaginationQuery()
  @ApiSuccessResponse(PaginatedUsersResponse, 'Paginated user list')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  listUser(
    @Req() req: Request,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponse> {
    return this.executeRequest(
      'listUser',
      () => this.userService.listUser(req, query),
      'Could not list users',
    );
  }

  @Post()
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'User created')
  @ApiErrorResponses('badRequest', 'conflict', 'internal')
  createUser(@Body() payload: CreateUserDto): Promise<UserActionResponse> {
    return this.executeRequest(
      'createUser',
      () => this.userService.createUser(payload),
      'Could not create user',
    );
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'Verification email resent')
  @ApiErrorResponses('badRequest', 'internal')
  resendVerification(@Body() payload: ResendVerificationDto): Promise<UserActionResponse> {
    return this.executeRequest(
      'resendVerification',
      () => this.userService.resendVerificationEmailAction(payload),
      'Could not resend verification email',
    );
  }

  @Post('activate/:url')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'User activated')
  @ApiErrorResponses('badRequest', 'notFound', 'internal')
  activateUser(@Param('url') url: string): Promise<UserActionResponse> {
    return this.executeRequest(
      'activateUser',
      () => this.userService.activateUser(url),
      'Could not activate user',
    );
  }

  @Post('login')
  @HttpCode(200)
  @ApiSuccessResponse(AuthenticatedUserModel, 'Authenticated user')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'internal')
  loginUser(@Req() req: Request, @Body() payload: LoginUserDto): Promise<AuthenticatedUserModel> {
    return this.executeRequest(
      'loginUser',
      () => this.userService.loginUser(req, payload),
      'Could not log in user',
    );
  }

  @Post('forgot')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'Password recovery flow started')
  @ApiErrorResponses('badRequest', 'notFound', 'internal')
  forgotPassword(@Body() payload: ForgotPasswordDto): Promise<UserActionResponse> {
    return this.executeRequest(
      'forgotPassword',
      () => this.userService.forgotPassword(payload),
      'Could not start forgot password flow',
    );
  }

  @Post('store-password')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'Password stored')
  @ApiErrorResponses('badRequest', 'notFound', 'internal')
  storePasswordDashed(@Body() payload: StorePasswordDto): Promise<UserActionResponse> {
    return this.executeRequest(
      'storePasswordDashed',
      () => this.userService.storePassword(payload),
      'Could not store password',
    );
  }

  @Post('storePassword')
  @HttpCode(200)
  @ApiOperation({ summary: 'Legacy alias for storing a password', deprecated: true })
  @ApiSuccessResponse(UserActionResponse, 'Password stored')
  @ApiErrorResponses('badRequest', 'notFound', 'internal')
  storePasswordLegacy(@Body() payload: StorePasswordDto): Promise<UserActionResponse> {
    return this.executeRequest(
      'storePasswordLegacy',
      () => this.userService.storePassword(payload),
      'Could not store password',
    );
  }

  @Post('logout')
  @HttpCode(200)
  @ApiSuccessResponse(UserActionResponse, 'User logged out')
  @ApiErrorResponses('unauthorized', 'internal')
  logoutUser(@Req() req: Request): Promise<UserActionResponse> {
    return this.executeRequest(
      'logoutUser',
      () => this.userService.logoutUser(req),
      'Could not log out user',
    );
  }

  @Post('send-email')
  @HttpCode(200)
  @ApiSuccessResponse(SendUserEmailResponse, 'Email sent')
  @ApiErrorResponses('badRequest', 'unauthorized', 'internal')
  sendUserEmail(
    @Req() req: Request,
    @Body() payload: SendUserEmailDto,
  ): Promise<SendUserEmailResponse> {
    return this.executeRequest(
      'sendUserEmail',
      () => this.userService.sendUserEmail(req, payload),
      'Could not send user email',
    );
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

  @Get('by-email/:email')
  @ApiSuccessResponse(UserModel, 'User found')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  getByEmail(
    @Req() req: Request,
    @Param('email') email: string,
  ): Promise<UserModel> {
    return this.executeRequest(
      'getByEmail',
      () => this.userService.getByEmail(req, email),
      'Could not load user by email',
    );
  }

  @Get(':id')
  @ApiSuccessResponse(UserModel, 'User found')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  getById(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserModel> {
    return this.executeRequest(
      'getById',
      () => this.userService.getById(req, id),
      'Could not load user',
    );
  }

  @Put(':id')
  @ApiSuccessResponse(UserModel, 'User updated')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'conflict', 'internal')
  updateUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
  ): Promise<UserModel> {
    return this.executeRequest(
      'updateUser',
      () => this.userService.updateUser(req, id, payload),
      'Could not update user',
    );
  }

  @Delete(':id')
  @ApiSuccessResponse(UserModel, 'User deleted')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'internal')
  removeUser(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserModel> {
    return this.executeRequest(
      'removeUser',
      () => this.userService.removeUser(req, id),
      'Could not remove user',
    );
  }
}
