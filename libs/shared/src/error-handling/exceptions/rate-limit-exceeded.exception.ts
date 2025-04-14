import { BaseException } from './base.exception';
import { HttpStatus } from '@nestjs/common';

export class RateLimitExceededException extends BaseException {
  readonly statusCode = HttpStatus.TOO_MANY_REQUESTS;
  
  constructor(serviceName?: string) {
    const message = serviceName
      ? `Rate limit exceeded for ${serviceName} API. Please try again later.`
      : 'Rate limit exceeded. Please try again later.';
    
    super(message, 'RATE_LIMIT_EXCEEDED');
  }
} 