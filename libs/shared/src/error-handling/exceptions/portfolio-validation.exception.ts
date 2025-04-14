import { BaseException } from './base.exception';
import { HttpStatus } from '@nestjs/common';

export class PortfolioValidationException extends BaseException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  
  constructor(reason: string) {
    super(`Portfolio validation failed: ${reason}`, 'PORTFOLIO_VALIDATION_FAILED');
  }
} 