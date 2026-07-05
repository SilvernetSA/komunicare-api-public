import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

type ErrorLike = {
  code?: number | string;
  errors?: Record<string, { message?: string }>;
  message?: string | string[];
  name?: string;
  path?: string;
  response?: any;
  stack?: string;
  status?: number;
  statusCode?: number;
  value?: unknown;
};

const DUPLICATE_KEY_ERROR_CODE = 11000;

const getFirstMessage = (message: unknown): string | undefined => {
  if (Array.isArray(message)) {
    return message.find((item) => typeof item === 'string');
  }

  return typeof message === 'string' ? message : undefined;
};

const getNestedMessage = (error: ErrorLike): string | undefined => {
  if (error.response) {
    const responseMessage = getFirstMessage(error.response.message);
    if (responseMessage) {
      return responseMessage;
    }

    if (typeof error.response.error === 'string') {
      return error.response.error;
    }

    if (typeof error.response.error_description === 'string') {
      return error.response.error_description;
    }
  }

  return undefined;
};

const getMongooseValidationMessage = (error: ErrorLike): string | undefined => {
  if (!error.errors) {
    return undefined;
  }

  const messages = Object.values(error.errors)
    .map((entry) => entry?.message)
    .filter((entry): entry is string => Boolean(entry));

  return messages.length ? messages.join(', ') : undefined;
};

const extractMessage = (
  error: ErrorLike,
  defaultMessage: string,
): string => {
  return (
    getNestedMessage(error) ||
    getMongooseValidationMessage(error) ||
    getFirstMessage(error.message) ||
    defaultMessage
  );
};

const resolveStatusCode = (error: ErrorLike): number | undefined => {
  if (typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  if (typeof error.status === 'number') {
    return error.status;
  }

  if (typeof error.response?.status === 'number') {
    return error.response.status;
  }

  return undefined;
};

const httpExceptionForStatus = (
  statusCode: number,
  message: string,
): HttpException => {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return new BadRequestException(message);
    case HttpStatus.UNAUTHORIZED:
      return new UnauthorizedException(message);
    case HttpStatus.FORBIDDEN:
      return new ForbiddenException(message);
    case HttpStatus.NOT_FOUND:
      return new NotFoundException(message);
    case HttpStatus.CONFLICT:
      return new ConflictException(message);
    default:
      return new HttpException(
        {
          statusCode,
          error: HttpStatus[statusCode] || 'Error',
          message,
        },
        statusCode,
      );
  }
};

export const normalizeControllerError = (
  controllerName: string,
  operationName: string,
  error: unknown,
  defaultMessage: string,
): HttpException => {
  if (error instanceof HttpException) {
    return error;
  }

  const logger = new Logger(controllerName);
  const candidate = (error || {}) as ErrorLike;
  const message = extractMessage(candidate, defaultMessage);

  logger.error(`${operationName} failed: ${message}`, candidate.stack);

  if (candidate.code === DUPLICATE_KEY_ERROR_CODE) {
    return new ConflictException(message || 'Resource already exists');
  }

  if (candidate.name === 'ValidationError') {
    return new BadRequestException(message || 'Validation failed');
  }

  if (candidate.name === 'CastError') {
    return new BadRequestException(
      candidate.path
        ? `Invalid value for "${candidate.path}"`
        : 'Invalid request parameter',
    );
  }

  const statusCode = resolveStatusCode(candidate);
  if (statusCode) {
    return httpExceptionForStatus(statusCode, message);
  }

  if (/not found/i.test(message)) {
    return new NotFoundException(message);
  }

  if (/unauthorized|not authorized|not valid token/i.test(message)) {
    return new UnauthorizedException(message);
  }

  if (/forbidden|not allowed/i.test(message)) {
    return new ForbiddenException(message);
  }

  if (/already exists|already in use|duplicate|conflict/i.test(message)) {
    return new ConflictException(message);
  }

  if (/invalid|required|missing|malformed/i.test(message)) {
    return new BadRequestException(message);
  }

  return new InternalServerErrorException(defaultMessage);
};
