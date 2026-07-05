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
import { CreateCommunicatorDto } from './dto/create-communicator.dto';
import { ListCommunicatorsByEmailDto } from './dto/list-communicators-by-email.dto';
import { UpdateCommunicatorDto } from './dto/update-communicator.dto';
import {
  CommunicatorModel,
  CreateCommunicatorResponse,
  PaginatedCommunicatorModelResponse,
} from './models/communicator.model';
import { CommunicatorService } from './communicator.service';

@ApiTags('communicator')
@Controller('communicator')
export class CommunicatorController extends BaseController {
  constructor(private readonly communicatorService: CommunicatorService) {
    super();
  }

  @Get()
  @ApiPaginationQuery()
  @ApiSuccessResponse(
    PaginatedCommunicatorModelResponse,
    'Paginated communicator list',
  )
  @ApiErrorResponses('unauthorized', 'internal')
  async listCommunicators(
    @Req() req: Request,
    @Query() query: ListCommunicatorsByEmailDto,
  ): Promise<PaginatedCommunicatorModelResponse> {
    return this.executeRequest(
      'listCommunicators',
      () => this.communicatorService.listCommunicators(req, query),
      'Could not list communicators',
    );
  }

  @Get('byemail/:email')
  @ApiPaginationQuery()
  @ApiSuccessResponse(
    PaginatedCommunicatorModelResponse,
    'Paginated communicator list for the requested user',
  )
  @ApiErrorResponses('unauthorized', 'forbidden', 'internal')
  async getCommunicatorsByEmail(
    @Req() req: Request,
    @Param('email') email: string,
    @Query() query: ListCommunicatorsByEmailDto,
  ): Promise<PaginatedCommunicatorModelResponse> {
    return this.executeRequest(
      'getCommunicatorsByEmail',
      () => this.communicatorService.getCommunicatorsByEmail(req, email, query),
      'Could not list communicators by email',
    );
  }

  @Get(':id')
  @ApiSuccessResponse(CommunicatorModel, 'Communicator found')
  @ApiErrorResponses('unauthorized', 'notFound', 'internal')
  async getCommunicator(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<CommunicatorModel> {
    return this.executeRequest(
      'getCommunicator',
      () => this.communicatorService.getCommunicator(req, id),
      'Could not load communicator',
    );
  }

  @Post()
  @HttpCode(200)
  @ApiSuccessResponse(CreateCommunicatorResponse, 'Communicator created')
  @ApiErrorResponses('badRequest', 'unauthorized', 'internal')
  async createCommunicator(
    @Req() req: Request,
    @Body() payload: CreateCommunicatorDto,
  ): Promise<CreateCommunicatorResponse> {
    return this.executeRequest(
      'createCommunicator',
      () => this.communicatorService.createCommunicator(req, payload),
      'Could not create communicator',
    );
  }

  @Put(':id')
  @ApiSuccessResponse(CommunicatorModel, 'Communicator updated')
  @ApiErrorResponses('badRequest', 'unauthorized', 'notFound', 'internal')
  async updateCommunicator(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() payload: UpdateCommunicatorDto,
  ): Promise<CommunicatorModel> {
    return this.executeRequest(
      'updateCommunicator',
      () => this.communicatorService.updateCommunicator(req, id, payload),
      'Could not update communicator',
    );
  }

  @Delete(':id')
  @ApiSuccessResponse(CommunicatorModel, 'Communicator deleted')
  @ApiErrorResponses('unauthorized', 'notFound', 'internal')
  async deleteCommunicator(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<CommunicatorModel> {
    return this.executeRequest(
      'deleteCommunicator',
      () => this.communicatorService.deleteCommunicator(req, id),
      'Could not delete communicator',
    );
  }
}
