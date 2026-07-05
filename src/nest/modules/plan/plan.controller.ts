import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessResponse } from '../../common/swagger.decorators';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanPriceDto } from './dto/update-plan-price.dto';
import { PlanListResponse, PlanModel } from './models/plan.model';
import { PlanService } from './plan.service';

@ApiTags('plans')
@Controller('plans')
export class PlanController extends BaseController {
  constructor(private readonly planService: PlanService) {
    super();
  }

  @Post()
  @HttpCode(200)
  @ApiSuccessResponse(PlanModel, 'Plan created')
  @ApiErrorResponses('badRequest', 'unauthorized', 'internal')
  createPlan(
    @Req() req: Request,
    @Body() payload: CreatePlanDto,
  ): Promise<PlanModel> {
    return this.executeRequest(
      'createPlan',
      () => this.planService.createPlan(req, payload),
      'Could not create plan',
    );
  }

  @Get()
  @ApiSuccessResponse(PlanListResponse, 'Plan list')
  @ApiErrorResponses('unauthorized', 'internal')
  getPlans(@Req() req: Request): Promise<PlanListResponse> {
    return this.executeRequest(
      'getPlans',
      () => this.planService.getPlans(req),
      'Could not list plans',
    );
  }

  @Put('backoffice/:id')
  @ApiSuccessResponse(PlanModel, 'Plan updated')
  @ApiErrorResponses('badRequest', 'unauthorized', 'forbidden', 'notFound', 'internal')
  updatePlanPrice(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() payload: UpdatePlanPriceDto,
  ): Promise<PlanModel> {
    return this.executeRequest(
      'updatePlanPrice',
      () => this.planService.updatePlanPrice(req, id, payload),
      'Could not update plan',
    );
  }

  @Delete('backoffice/:id')
  @ApiSuccessResponse(PlanModel, 'Plan deleted')
  @ApiErrorResponses('unauthorized', 'forbidden', 'notFound', 'internal')
  deletePlan(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<PlanModel> {
    return this.executeRequest(
      'deletePlan',
      () => this.planService.deletePlan(req, id),
      'Could not delete plan',
    );
  }

  @Get(':id')
  @ApiSuccessResponse(PlanModel, 'Plan found')
  @ApiErrorResponses('unauthorized', 'notFound', 'internal')
  getPlanById(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<PlanModel> {
    return this.executeRequest(
      'getPlanById',
      () => this.planService.getPlanById(req, id),
      'Could not load plan',
    );
  }
}
