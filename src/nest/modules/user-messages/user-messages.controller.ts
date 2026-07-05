import {
  BadRequestException,
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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { LegacyUserReferenceQueryDto } from '../../common/dto/legacy-user-reference-query.dto';
import {
  ApiCreatedSuccessResponse,
  ApiErrorResponses,
  ApiNoContentSuccessResponse,
  ApiSuccessArrayResponse,
  ApiSuccessResponse,
} from '../../common/swagger.decorators';
import { CreateUserMessageDto } from './dto/create-user-message.dto';
import { UpdateUserMessageDto } from './dto/update-user-message.dto';
import { UserMessageModel } from './models/user-message.model';
import { UserMessagesService } from './user-messages.service';

@ApiTags('user-messages')
@Controller('user-messages')
export class UserMessagesController extends BaseController {
  constructor(private readonly userMessagesService: UserMessagesService) {
    super();
  }

  @Get()
  @ApiSuccessArrayResponse(UserMessageModel, 'User messages')
  @ApiErrorResponses('badRequest', 'unauthorized', 'internal')
  listUserMessages(
    @Req() req: Request,
    @Query() query: LegacyUserReferenceQueryDto,
  ): Promise<UserMessageModel[]> {
    return this.executeRequest(
      'listUserMessages',
      () =>
        this.userMessagesService.listUserMessages(
          req,
          query.userId || query.user,
        ),
      'Could not list user messages',
    );
  }

  @Post()
  @ApiCreatedSuccessResponse(UserMessageModel, 'User message created')
  @ApiErrorResponses('badRequest', 'unauthorized', 'internal')
  createUserMessage(
    @Req() req: Request,
    @Query() query: LegacyUserReferenceQueryDto,
    @Body() payload: CreateUserMessageDto,
  ): Promise<UserMessageModel> {
    return this.executeRequest(
      'createUserMessage',
      () =>
        this.userMessagesService.createUserMessage(req, {
          ...payload,
          userId: payload.userId || query.userId || query.user,
        }),
      'Could not create user message',
    );
  }

  @Put()
  @ApiOperation({
    summary: 'Legacy user message update using query param id',
    deprecated: true,
  })
  @ApiQuery({ name: 'id', required: true, type: String })
  @ApiSuccessResponse(UserMessageModel, 'User message updated')
  @ApiErrorResponses('badRequest', 'unauthorized', 'notFound', 'internal')
  updateUserMessageLegacy(
    @Req() req: Request,
    @Query('id') id: string | undefined,
    @Body() payload: UpdateUserMessageDto,
  ): Promise<UserMessageModel> {
    return this.executeRequest(
      'updateUserMessageLegacy',
      async () => {
        const targetId = id?.trim();
        if (!targetId) {
          throw new BadRequestException('Message ID missing');
        }

        return this.userMessagesService.updateUserMessage(req, targetId, payload);
      },
      'Could not update user message',
    );
  }

  @Put(':id')
  @ApiSuccessResponse(UserMessageModel, 'User message updated')
  @ApiErrorResponses('badRequest', 'unauthorized', 'notFound', 'internal')
  updateUserMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() payload: UpdateUserMessageDto,
  ): Promise<UserMessageModel> {
    return this.executeRequest(
      'updateUserMessage',
      () => this.userMessagesService.updateUserMessage(req, id, payload),
      'Could not update user message',
    );
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Legacy user message delete using query param id',
    deprecated: true,
  })
  @ApiQuery({ name: 'id', required: true, type: String })
  @ApiNoContentSuccessResponse('User message deleted')
  @ApiErrorResponses('badRequest', 'unauthorized', 'notFound', 'internal')
  deleteUserMessageLegacy(
    @Req() req: Request,
    @Query('id') id: string | undefined,
  ): Promise<void> {
    return this.executeRequest(
      'deleteUserMessageLegacy',
      async () => {
        const targetId = id?.trim();
        if (!targetId) {
          throw new BadRequestException('Message ID missing');
        }

        return this.userMessagesService.deleteUserMessage(req, targetId);
      },
      'Could not delete user message',
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentSuccessResponse('User message deleted')
  @ApiErrorResponses('badRequest', 'unauthorized', 'notFound', 'internal')
  deleteUserMessage(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<void> {
    return this.executeRequest(
      'deleteUserMessage',
      () => this.userMessagesService.deleteUserMessage(req, id),
      'Could not delete user message',
    );
  }
}
