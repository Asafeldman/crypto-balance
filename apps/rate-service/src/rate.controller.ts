import { Controller, Get } from '@nestjs/common';
import { RateService } from './rate.service';

@Controller()
export class RateController {
  constructor(private readonly rateService: RateService) {}

  @Get()
  getHello(): string {
    return this.rateService.getHello();
  }
} 