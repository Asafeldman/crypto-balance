import { Controller, Get } from '@nestjs/common';
import { BalanceService } from './balance.service';

@Controller()
export class BalanceController {
  constructor(private readonly appService: BalanceService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
