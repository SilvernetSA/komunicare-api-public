import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiErrorResponseModel } from './models/api-error-response.model';

type ErrorStatus =
  | 'badRequest'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'internal';

export const ApiErrorResponses = (...statuses: ErrorStatus[]) =>
  applyDecorators(
    ...statuses.map((status) => {
      switch (status) {
        case 'badRequest':
          return ApiBadRequestResponse({
            description: 'Bad request',
            type: ApiErrorResponseModel,
          });
        case 'unauthorized':
          return ApiUnauthorizedResponse({
            description: 'Unauthorized',
            type: ApiErrorResponseModel,
          });
        case 'forbidden':
          return ApiForbiddenResponse({
            description: 'Forbidden',
            type: ApiErrorResponseModel,
          });
        case 'notFound':
          return ApiNotFoundResponse({
            description: 'Resource not found',
            type: ApiErrorResponseModel,
          });
        case 'conflict':
          return ApiConflictResponse({
            description: 'Conflict',
            type: ApiErrorResponseModel,
          });
        case 'internal':
        default:
          return ApiInternalServerErrorResponse({
            description: 'Internal server error',
            type: ApiErrorResponseModel,
          });
      }
    }),
  );

export const ApiPaginationQuery = () =>
  applyDecorators(
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 10 }),
    ApiQuery({ name: 'offset', required: false, type: Number, example: 0 }),
    ApiQuery({ name: 'sort', required: false, type: String, example: '-_id' }),
    ApiQuery({ name: 'search', required: false, type: String, example: '' }),
    ApiQuery({ name: 'order', required: false, type: String, example: '' }),
  );

type SwaggerResponseType = Type<unknown>;

export const ApiSuccessResponse = (
  type: SwaggerResponseType,
  description = 'Successful response',
) =>
  ApiOkResponse({
    description,
    type,
  });

export const ApiSuccessArrayResponse = (
  type: SwaggerResponseType,
  description = 'Successful response',
) =>
  ApiOkResponse({
    description,
    type,
    isArray: true,
  });

export const ApiCreatedSuccessResponse = (
  type: SwaggerResponseType,
  description = 'Resource created successfully',
) =>
  ApiCreatedResponse({
    description,
    type,
  });

export const ApiSchemaSuccessResponse = (
  schema: Record<string, unknown>,
  description = 'Successful response',
) =>
  ApiOkResponse({
    description,
    schema,
  });

export const ApiEmptySuccessResponse = (
  description = 'Operation completed successfully',
) => ApiOkResponse({ description });

export const ApiNoContentSuccessResponse = (
  description = 'Operation completed successfully',
) => ApiNoContentResponse({ description });

export const ApiFreeformObjectBody = (
  description = 'Free-form JSON object',
  example?: Record<string, unknown>,
) =>
  ApiBody({
    description,
    schema: {
      type: 'object',
      additionalProperties: true,
      ...(example ? { example } : {}),
    },
  });

export const ApiBinaryFileBody = (fieldName = 'file') =>
  applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
        required: [fieldName],
      },
    }),
  );
