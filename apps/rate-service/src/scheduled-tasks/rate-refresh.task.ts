import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RateService } from '../rate.service';
import { SERVICES } from '../../../../libs/shared/src/constants';

@Injectable()
export class RateRefreshTask {
  private readonly logger = new Logger(RateRefreshTask.name);
  
  constructor(private readonly rateService: RateService) {}
  
  @Cron(SERVICES.RATE.REFRESH_INTERVAL)
  async refreshRates() {
    this.logger.log('Starting scheduled rate refresh...');
    
    try {
      const rates = await this.rateService.getAllRates();
      const coinIds = rates.map(rate => rate.id);
      
      if (coinIds.length > 0) {
        this.logger.log(`Refreshing rates for ${coinIds.length} coins...`);
        await this.rateService.getRatesByIds(coinIds);
        this.logger.log('Rate refresh completed successfully');
      } else {
        this.logger.log('No coins to refresh');
      }
    } catch (error) {
      this.logger.error(`Error during scheduled rate refresh: ${error.message}`, error.stack);
    }
  }
} 