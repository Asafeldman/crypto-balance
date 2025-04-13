import { Controller, Get, Param, Query } from '@nestjs/common';
import { RateService } from './rate.service';
import { CoinRate } from './interfaces/rate.interface';

@Controller('rates')
export class RateController {
  constructor(private readonly rateService: RateService) {}

  @Get(':coinIds')
  async getRatesByIds(
    @Param('coinIds') coinIds: string,
    @Query('vs_currencies') vsCurrencies?: string
  ): Promise<CoinRate[] | CoinRate | null> {
    const ids = coinIds.split(',');
    
    if (ids.length === 1) {
      return this.rateService.getRateById(
        ids[0], 
        {
          vsCurrencies: vsCurrencies || 'usd'
        }
      );
    }
    
    return this.rateService.getRatesByIds(
      ids, 
      {
        vsCurrencies: vsCurrencies || 'usd'
      }
    );
  }

  @Get()
  async getAllRates(
    @Query('vs_currencies') vsCurrencies?: string
  ): Promise<CoinRate[]> {
    return this.rateService.getAllRates(
      {
        vsCurrencies: vsCurrencies || 'usd'
      }
    );
  }
} 