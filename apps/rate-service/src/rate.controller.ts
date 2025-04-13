import { Controller, Get, Query } from '@nestjs/common';
import { RateService } from './rate.service';
import { CoinRate } from '../../../libs/shared/src/interfaces/rate.interface';

@Controller('rates')
export class RateController {
  constructor(private readonly rateService: RateService) {}

  @Get()
  async getRates(
    @Query('ids') ids?: string,
    @Query('vs_currencies') vsCurrencies?: string
  ): Promise<CoinRate[] | null> {
    if (!ids) {
      return this.rateService.getAllRates({
        vsCurrencies: vsCurrencies || 'usd'
      });
    }
    
    const coinIds = ids.split(',');
    return this.rateService.getRatesByIds(coinIds, {
      vsCurrencies: vsCurrencies || 'usd'
    });
  }
} 