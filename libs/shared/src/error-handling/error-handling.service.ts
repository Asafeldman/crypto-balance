import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class ErrorHandlingService {
  private readonly logger = new Logger(ErrorHandlingService.name);

  /**
   * Handles an error by logging it with context
   */
  handleError(error: unknown, context: string): void {
    if (error instanceof Error) {
      this.logger.error(`Error in ${context}: ${error.message}`, error.stack);
    } else {
      this.logger.error(`Unknown error in ${context}:`, String(error));
    }
  }
  
  /**
   * Extracts a message from an error object safely
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const status = error.getStatus();
      
      // Handle different status codes with user-friendly messages
      switch (status) {
        case HttpStatus.TOO_MANY_REQUESTS:
          return 'Too many requests. Please try again later.';
        case HttpStatus.UNAUTHORIZED:
          return 'Authentication required.';
        case HttpStatus.FORBIDDEN:
          return 'You do not have permission to access this resource.';
        case HttpStatus.NOT_FOUND:
          return 'The requested resource was not found.';
        case HttpStatus.BAD_REQUEST:
          return error.message || 'Invalid request parameters.';
        case HttpStatus.REQUEST_TIMEOUT:
          return 'Request timed out. Please try again.';
        case HttpStatus.GATEWAY_TIMEOUT:
          return 'Service is temporarily unavailable. Please try again later.';
        case HttpStatus.SERVICE_UNAVAILABLE:
          return 'Service is currently unavailable. Please try again later.';
        case HttpStatus.INTERNAL_SERVER_ERROR:
          return 'An unexpected error occurred. Our team has been notified.';
        default:
          return error.message;
      }
    }
    
    if (error instanceof Error) return error.message;
    return String(error);
  }

  /**
   * Determines if an error is a specific type
   */
  isHttpError(error: unknown): boolean {
    return error instanceof Error && 'status' in error;
  }
} 