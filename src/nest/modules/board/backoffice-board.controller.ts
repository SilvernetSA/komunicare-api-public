import {
  Controller,
  Get,
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
import { ListBoardsByEmailDto } from './dto/list-boards-by-email.dto';
import { PaginatedPublicBoardReportModelResponse } from './models/board.model';
import { BoardService } from './board.service';

@ApiTags('backoffice-board')
@Controller('backoffice/board')
export class BackofficeBoardController extends BaseController {
  constructor(private readonly boardService: BoardService) {
    super();
  }

  @Get('reports')
  @ApiPaginationQuery()
  @ApiSuccessResponse(PaginatedPublicBoardReportModelResponse, 'Paginated public board reports')
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  listPublicBoardReportsBackoffice(
    @Req() req: Request,
    @Query() query: ListBoardsByEmailDto,
  ): Promise<PaginatedPublicBoardReportModelResponse> {
    return this.executeRequest(
      'listPublicBoardReportsBackoffice',
      () => this.boardService.listPublicBoardReportsBackoffice(req, query),
      'Could not list public board reports',
    );
  }
}
