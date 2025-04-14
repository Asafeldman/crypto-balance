import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BaseException } from '../exceptions/base.exception';
import { ErrorHandlingService } from '../error-handling.service';

interface ErrorResponse {
  statusCode: number;
  message: string;
  code?: string;
  timestamp: string;
  path: string;
  errors?: Record<string, any>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  
  constructor(private readonly errorHandlingService: ErrorHandlingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    
    const status = this.getStatus(exception);
    const errorResponse = this.buildErrorResponse(exception, request.url, status);
    
    // Log the error with context
    this.logger.error(
      `Exception caught: ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : undefined,
    );
    
    response.status(status).json(errorResponse);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildErrorResponse(
    exception: unknown,
    path: string,
    statusCode: number,
  ): ErrorResponse {
    const errorResponse: ErrorResponse = {
      statusCode,
      message: this.errorHandlingService.getErrorMessage(exception),
      timestamp: new Date().toISOString(),
      path,
    };

    // Add error code if available
    if (exception instanceof BaseException && exception.code) {
      errorResponse.code = exception.code;
    }

    // Add validation errors if available
    if (
      exception instanceof BaseException &&
      'errors' in exception &&
      exception.errors !== null &&
      typeof exception.errors === 'object'
    ) {
      errorResponse.errors = exception.errors as Record<string, any>;
    }

    return errorResponse;
  }
} 