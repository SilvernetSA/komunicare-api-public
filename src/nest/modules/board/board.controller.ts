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
  ApiFreeformObjectBody,
  ApiPaginationQuery,
  ApiSuccessResponse,
} from '../../common/swagger.decorators';
import { ListBoardsByEmailDto } from './dto/list-boards-by-email.dto';
import { CopyPublicBoardDto } from './dto/copy-public-board.dto';
import { ReportPublicBoardDto } from './dto/report-public-board.dto';
import {
  BoardActionResponse,
  BoardModel,
  PaginatedBoardModelResponse,
} from './models/board.model';
import { BoardService } from './board.service';

@ApiTags('board')
@Controller('board')
export class BoardController extends BaseController {
  constructor(private readonly boardService: BoardService) {
    super();
  }

  @Get()
  @ApiPaginationQuery()
  @ApiSuccessResponse(PaginatedBoardModelResponse, 'Paginated board list')
  @ApiErrorResponses('badRequest', 'internal')
  async listBoard(
    @Query() query: ListBoardsByEmailDto,
  ): Promise<PaginatedBoardModelResponse> {
    return this.executeRequest(
      'listBoard',
      () => this.boardService.listBoard(query),
      'Could not list boards',
    );
  }

  @Get('byemail/:email')
  @ApiPaginationQuery()
  @ApiSuccessResponse(PaginatedBoardModelResponse, 'Paginated board list for the requested user')
  @ApiErrorResponses('badRequest', 'forbidden', 'internal')
  async getBoardsByEmail(
    @Req() req: Request,
    @Param('email') email: string,
    @Query() query: ListBoardsByEmailDto,
  ): Promise<PaginatedBoardModelResponse> {
    return this.executeRequest(
      'getBoardsByEmail',
      () => this.boardService.getBoardsByEmail(req, email, query),
      'Could not list boards by email',
    );
  }

  @Get('public')
  @ApiPaginationQuery()
  @ApiSuccessResponse(PaginatedBoardModelResponse, 'Paginated public board list')
  @ApiErrorResponses('badRequest', 'internal')
  async getPublicBoards(
    @Req() req: Request,
    @Query() query: ListBoardsByEmailDto,
  ): Promise<PaginatedBoardModelResponse> {
    return this.executeRequest(
      'getPublicBoards',
      () => this.boardService.getPublicBoards(req, query),
      'Could not list public boards',
    );
  }

  @Post('report')
  @HttpCode(200)
  @ApiSuccessResponse(BoardActionResponse, 'Public board report sent')
  @ApiErrorResponses('badRequest', 'internal')
  async reportPublicBoard(
    @Body() payload: ReportPublicBoardDto,
  ): Promise<BoardActionResponse> {
    return this.executeRequest(
      'reportPublicBoard',
      () => this.boardService.reportPublicBoard(payload),
      'Could not report public board',
    );
  }

  @Post('copy-public')
  @HttpCode(200)
  @ApiSuccessResponse(Object, 'Public board copied to a personal communicator')
  @ApiErrorResponses('badRequest', 'forbidden', 'notFound', 'internal')
  async copyPublicBoard(
    @Req() req: Request,
    @Body() payload: CopyPublicBoardDto,
  ): Promise<Record<string, unknown>> {
    return this.executeRequest(
      'copyPublicBoard',
      () => this.boardService.copyPublicBoard(req, payload),
      'Could not copy public board',
    );
  }

  @Get(':id')
  @ApiSuccessResponse(BoardModel, 'Board found')
  @ApiErrorResponses('forbidden', 'notFound', 'internal')
  async getBoard(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<BoardModel> {
    return this.executeRequest(
      'getBoard',
      () => this.boardService.getBoard(req, id),
      'Could not load board',
    );
  }

  @Post()
  @HttpCode(200)
  @ApiFreeformObjectBody('Board payload', {
    name: 'Tablero Komunicare',
    author: 'Komunicare',
    email: 'user@example.com',
    locale: 'es-ES',
    grid: { rows: 6, columns: 5, order: [] },
  })
  @ApiSuccessResponse(BoardModel, 'Board created')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  async createBoard(
    @Req() req: Request,
    @Body() payload: Record<string, any>,
  ): Promise<BoardModel> {
    return this.executeRequest(
      'createBoard',
      () => this.boardService.createBoard(req, payload),
      'Could not create board',
    );
  }

  @Put(':id')
  @ApiFreeformObjectBody('Board payload', {
    name: 'Tablero actualizado',
    description: 'Descripción actualizada',
    locale: 'es-AR',
  })
  @ApiSuccessResponse(BoardModel, 'Board updated')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  async updateBoard(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() payload: Record<string, any>,
  ): Promise<BoardModel> {
    return this.executeRequest(
      'updateBoard',
      () => this.boardService.updateBoard(req, id, payload),
      'Could not update board',
    );
  }

  @Delete(':id')
  @ApiSuccessResponse(BoardModel, 'Board deleted')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  async deleteBoard(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<BoardModel> {
    return this.executeRequest(
      'deleteBoard',
      () => this.boardService.deleteBoard(req, id),
      'Could not delete board',
    );
  }
}
