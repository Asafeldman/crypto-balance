import { BaseException } from './base.exception';
import { HttpStatus } from '@nestjs/common';

export class InvalidAssetException extends BaseException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  
  constructor(asset: string, reason?: string) {
    const message = reason 
      ? `Invalid asset: ${asset}. ${reason}`
      : `Invalid asset: ${asset}. Please check the correct name for the asset you're trying to use.`;
    
    super(message, 'INVALID_ASSET');
  }
} 