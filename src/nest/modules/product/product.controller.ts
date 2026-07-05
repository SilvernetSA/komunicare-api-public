import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import { ApiErrorResponses, ApiSuccessResponse } from '../../common/swagger.decorators';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductListResponse, ProductModel } from './models/product.model';
import { ProductService } from './product.service';

@ApiTags('products')
@Controller('products')
export class ProductController extends BaseController {
  constructor(private readonly productService: ProductService) {
    super();
  }

  @Get()
  @ApiSuccessResponse(ProductListResponse, 'Product list')
  @ApiErrorResponses('unauthorized', 'internal')
  getProducts(@Req() req: Request): Promise<ProductListResponse> {
    return this.executeRequest(
      'getProducts',
      () => this.productService.getProducts(req),
      'Could not list products',
    );
  }

  @Post()
  @HttpCode(200)
  @ApiSuccessResponse(ProductModel, 'Product created')
  @ApiErrorResponses('unauthorized', 'conflict', 'internal')
  createProduct(
    @Req() req: Request,
    @Body() payload: CreateProductDto,
  ): Promise<ProductModel> {
    return this.executeRequest(
      'createProduct',
      () => this.productService.createProduct(req, payload),
      'Could not create product',
    );
  }
}
