import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessResponse } from '../../common/swagger.decorators';
import { CreateSystemBoardDto } from './dto/create-system-board.dto';
import { CreateSystemCommunicatorDto } from './dto/create-system-communicator.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { UpdateSystemBoardDto } from './dto/update-system-board.dto';
import { SystemBoardModel } from './models/system-board.model';
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

  // ── Public endpoints (no auth) ────────────────────────────────────────────
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

  // ── Backoffice endpoints (require admin) ──────────────────────────────────
  @Get('communicators')
  @ApiSuccessResponse(Object, 'Communicator list')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  getCommunicators(@Req() req: Request) {
    return this.executeRequest(
      'getCommunicators',
      () => this.service.getCommunicators(),
      'Could not load communicators',
    );
  }

  @Post('communicators')
  @ApiSuccessResponse(Object, 'System communicator created')
  @ApiErrorResponses('unauthorized', 'forbidden', 'badRequest', 'internal')
  createSystemCommunicator(@Req() req: Request, @Body() dto: CreateSystemCommunicatorDto) {
    return this.executeRequest(
      'createSystemCommunicator',
      () => this.service.createSystemCommunicator(req, dto),
      'Could not create system communicator',
    );
  }

  @Delete('communicators/:communicatorKey')
  @ApiSuccessResponse(Object, 'System communicator deleted')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  deleteSystemCommunicator(@Req() req: Request, @Param('communicatorKey') communicatorKey: string) {
    return this.executeRequest(
      'deleteSystemCommunicator',
      () => this.service.deleteSystemCommunicator(req, communicatorKey),
      'Could not delete system communicator',
    );
  }

  @Get(':communicator')
  @ApiSuccessResponse(SystemBoardModel, 'Boards by communicator')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  getBoardsByComm(@Req() _req: Request, @Param('communicator') communicator: string) {
    return this.executeRequest(
      'getBoardsByComm',
      () => this.service.getBoardsByComm(communicator),
      'Could not load boards',
    );
  }

  // ── Draft endpoints — registered BEFORE :communicator/:boardId ───────────
  @Get(':communicator/draft')
  @ApiSuccessResponse(Object, 'Active draft for communicator (null if none)')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  getDraft(@Req() req: Request, @Param('communicator') communicator: string) {
    return this.executeRequest(
      'getDraft',
      () => this.service.getDraft(req, communicator),
      'Could not load draft',
    );
  }

  @Put(':communicator/draft')
  @ApiSuccessResponse(Object, 'Draft saved')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  saveDraft(
    @Req() req: Request,
    @Param('communicator') communicator: string,
    @Body() dto: SaveDraftDto,
  ) {
    return this.executeRequest(
      'saveDraft',
      () => this.service.saveDraft(req, communicator, dto),
      'Could not save draft',
    );
  }

  @Post(':communicator/draft/publish')
  @ApiSuccessResponse(Object, 'Draft published to live')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  publishDraft(@Req() req: Request, @Param('communicator') communicator: string) {
    return this.executeRequest(
      'publishDraft',
      () => this.service.publishDraft(req, communicator),
      'Could not publish draft',
    );
  }

  @Delete(':communicator/draft')
  @ApiSuccessResponse(Object, 'Draft discarded')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  discardDraft(@Req() req: Request, @Param('communicator') communicator: string) {
    return this.executeRequest(
      'discardDraft',
      () => this.service.discardDraft(req, communicator),
      'Could not discard draft',
    );
  }

  @Get(':communicator/:boardId')
  @ApiSuccessResponse(SystemBoardModel, 'Board detail')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  getBoardById(@Req() _req: Request, @Param('boardId') boardId: string) {
    return this.executeRequest(
      'getBoardById',
      () => this.service.getBoardById(boardId),
      'Could not load board',
    );
  }

  @Post(':communicator')
  @ApiSuccessResponse(SystemBoardModel, 'Board created')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  createBoard(
    @Req() req: Request,
    @Param('communicator') communicator: string,
    @Body() dto: CreateSystemBoardDto,
  ) {
    return this.executeRequest(
      'createBoard',
      () => this.service.createBoard(req, communicator, dto),
      'Could not create board',
    );
  }

  @Put(':communicator/:boardId')
  @ApiSuccessResponse(SystemBoardModel, 'Board updated')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  updateBoard(
    @Req() req: Request,
    @Param('boardId') boardId: string,
    @Body() dto: UpdateSystemBoardDto,
  ) {
    return this.executeRequest(
      'updateBoard',
      () => this.service.updateBoard(req, boardId, dto),
      'Could not update board',
    );
  }
}
