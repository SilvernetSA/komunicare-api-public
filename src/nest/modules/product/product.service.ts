import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { LegacyAuthService } from '../../common/legacy-auth.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductListResponse, ProductModel } from './models/product.model';
import { ProductRepository } from './product.repository';

@Injectable()
export class ProductService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly productRepository: ProductRepository,
  ) {}

  async createProduct(
    req: Request,
    payload: CreateProductDto,
  ): Promise<ProductModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const isAdmin = Boolean(requester.isAdmin || requester.role === 'admin');

    if (!isAdmin) {
      throw new UnauthorizedException({
        message: 'Error getting subscriber',
        error:
          'Unauthorized request, subscriber object is only accessible with subscriber user authToken',
      });
    }

    try {
      const remoteProduct = await this.productRepository.createProduct(payload);
      const product = this.productRepository.createLocalProduct({
        productId: remoteProduct.id,
        name: payload.name,
        description: payload.description,
        platform: 'paypal',
      });
      const savedProduct = await this.productRepository.save(product);

      return typeof savedProduct.toJSON === 'function'
        ? (savedProduct.toJSON() as ProductModel)
        : (savedProduct as ProductModel);
    } catch (error) {
      throw new ConflictException({
        message: 'Error saving subscription',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getProducts(req: Request): Promise<ProductListResponse> {
    await this.legacyAuthService.getAuthorizedUser(req);

    try {
      const products = await this.productRepository.getProducts();
      const items = Array.isArray(products?.products) ? products.products : [];

      return {
        products: items,
        count: items.length,
      };
    } catch (error) {
      throw new ConflictException({
        message: 'Error saving subscription',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
