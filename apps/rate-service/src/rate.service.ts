import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FileManagementService } from '../../../libs/shared/src/file-management/file-management.service';
import { APP_SETTINGS, EXTERNAL_APIS } from '../../../libs/shared/src/constants';
import { CoinRate, RateOptions, RatesFile } from '../../../libs/shared/src/interfaces/rate.interface';
import { InvalidAssetException, RateLimitExceededException } from '../../../libs/shared/src/error-handling/exceptions';

@Injectable()
export class RateService {
  private readonly ratesFilePath: string;
  
  constructor(
    private readonly httpService: HttpService,
    private readonly fileManagementService: FileManagementService
  ) {
    this.ratesFilePath = this.fileManagementService.resolveDataPath('rates.json');
    
    this.fileManagementService.ensureDataFilesExist([
      { filename: 'rates.json', emptyContent: '{"rates":[],"globalLastUpdated":""}' }
    ]);
  }

  async getAllRates(options?: RateOptions): Promise<CoinRate[]> {
    const vsCurrencies = options?.vsCurrencies || 'usd';
    const requestedCurrencies = vsCurrencies.split(',');
    
    try {
      let ratesFile = this.fileManagementService.readJsonFile<RatesFile>(this.ratesFilePath);
      const now = new Date();
      
      const staleRates = ratesFile.rates.filter(rate => this.isRateStale(rate));
      const freshRates = ratesFile.rates.filter(rate => !this.isRateStale(rate));
      
      if (freshRates.length > 0) {
        const freshIds = freshRates.map(rate => rate.id);
        console.log(`Not refreshing for coins: ${freshIds.join(', ')}`);
      }
      
      if (staleRates.length > 0) {
        const staleIds = staleRates.map(rate => rate.id);
        console.log(`Refreshing rates for coins: ${staleIds.join(', ')}`);
        
        try {
          for (const staleRate of staleRates) {
            const existingCurrencies = staleRate.currencyRateMap ? 
              Object.keys(staleRate.currencyRateMap) : [];
            
            const allCurrencies = [...new Set([...existingCurrencies, ...requestedCurrencies])];
            
            const coinRates = await this.fetchRatesFromApi(
              [staleRate.id], 
              { vsCurrencies: allCurrencies.join(',') }
            );
            
            if (coinRates.length > 0) {
              const freshRate = coinRates[0];
              const index = ratesFile.rates.findIndex(r => r.id === staleRate.id);
              
              if (index !== -1) {
                ratesFile.rates[index] = {
                  ...ratesFile.rates[index],
                  currencyRateMap: freshRate.currencyRateMap,
                  lastUpdated: now.toISOString()
                };
              }
            }
          }
          
          ratesFile.globalLastUpdated = now.toISOString();
          this.fileManagementService.writeJsonFile(this.ratesFilePath, ratesFile);
        } catch (error: unknown) {
          console.error('Error refreshing stale rates:', error instanceof Error ? error.message : String(error));
        }
      }
      
      return ratesFile.rates;
    } catch (error: unknown) {
      console.error('Error getting cached rates:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }
  
  async getRateById(coinId: string, options?: RateOptions): Promise<CoinRate | null> {
    const vsCurrencies = options?.vsCurrencies || 'usd';
    const requestedCurrencies = vsCurrencies.split(',');
    
    try {
      let ratesFile = this.fileManagementService.readJsonFile<RatesFile>(this.ratesFilePath);
      const now = new Date();
      
      let coinRate = ratesFile.rates.find(rate => rate.id === coinId);
      const isCoinInCache = !!coinRate;
      
      const isCoinStale = isCoinInCache ? 
        (coinRate?.lastUpdated ? 
          (now.getTime() - new Date(coinRate.lastUpdated).getTime() > APP_SETTINGS.CACHE.TTL_MS)
          : true)
        : false;
      
      const hasMissingCurrencies = isCoinInCache && coinRate ? 
        requestedCurrencies.some(currency => 
          !coinRate?.currencyRateMap || coinRate.currencyRateMap[currency] === undefined
        ) : false;
      
      if (isCoinInCache && !isCoinStale && !hasMissingCurrencies) {
        console.log(`Not refreshing for coins: ${coinId}`);
      }
      
      if (!isCoinInCache || isCoinStale || hasMissingCurrencies) {
        const refreshReason = !isCoinInCache ? "not in cache" : 
                              isCoinStale ? "stale" : 
                              "missing requested currencies";
        console.log(`Refreshing rates for coins: ${coinId} (reason: ${refreshReason})`);
        
        try {
          let currenciesToFetch = requestedCurrencies;
          
          if (isCoinInCache && isCoinStale && coinRate) {
            const existingCurrencies = coinRate.currencyRateMap ? 
              Object.keys(coinRate.currencyRateMap) : [];
            
            currenciesToFetch = [...new Set([...existingCurrencies, ...requestedCurrencies])];
          }
          
          const fetchedRates = await this.fetchRatesFromApi(
            [coinId], 
            { vsCurrencies: currenciesToFetch.join(',') }
          );
          
          if (fetchedRates.length === 0) {
            return null;
          }
          
          const fetchedRate = fetchedRates[0];
          
          if (isCoinInCache) {
            const index = ratesFile.rates.findIndex(rate => rate.id === coinId);
            
            if (isCoinStale) {
              ratesFile.rates[index] = {
                ...ratesFile.rates[index],
                currencyRateMap: fetchedRate.currencyRateMap,
                lastUpdated: now.toISOString()
              };
            } else {
              ratesFile.rates[index] = {
                ...ratesFile.rates[index],
                currencyRateMap: {
                  ...ratesFile.rates[index].currencyRateMap,
                  ...fetchedRate.currencyRateMap
                },
                lastUpdated: now.toISOString()
              };
            }
            
            coinRate = ratesFile.rates[index];
          } else {
            ratesFile.rates.push(fetchedRate);
            coinRate = fetchedRate;
          }
          
          ratesFile.globalLastUpdated = now.toISOString();
          this.fileManagementService.writeJsonFile(this.ratesFilePath, ratesFile);
        } catch (error: unknown) {
          console.error(`Error fetching rate for coin ${coinId}: ${error instanceof Error ? error.message : String(error)}`);
          
          if (error instanceof RateLimitExceededException || error instanceof InvalidAssetException) {
            throw error;
          }
          
          if (!isCoinInCache) {
            return null;
          }
        }
      }
      
      if (coinRate) {
        const currencies = vsCurrencies.split(',');
        const existingCurrencies = Object.keys(coinRate.currencyRateMap || {});
        const missingCurrencies = currencies.filter(c => !existingCurrencies.includes(c));
        
        if (missingCurrencies.length > 0) {
          console.log(`Fetching missing currencies for ${coinId}: ${missingCurrencies.join(',')}`);
          
          try {
            const ratesWithNewCurrencies = await this.fetchRatesFromApi(
              [coinId], 
              { vsCurrencies: missingCurrencies.join(',') }
            );
            
            if (ratesWithNewCurrencies.length > 0) {
              const updatedRate = ratesWithNewCurrencies[0];
              
              const index = ratesFile.rates.findIndex(rate => rate.id === coinId);
              ratesFile.rates[index].currencyRateMap = {
                ...ratesFile.rates[index].currencyRateMap,
                ...updatedRate.currencyRateMap
              };
              ratesFile.rates[index].lastUpdated = now.toISOString();
              coinRate = ratesFile.rates[index];
              
              ratesFile.globalLastUpdated = now.toISOString();
              this.fileManagementService.writeJsonFile(this.ratesFilePath, ratesFile);
            }
          } catch (error: unknown) {
            console.error(`Error fetching missing currencies for ${coinId}:`, error instanceof Error ? error.message : String(error));
          }
        }
      }
      
      return coinRate || null;
    } catch (error: unknown) {
      console.error(`Error getting rate for coin ${coinId}: ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof RateLimitExceededException || error instanceof InvalidAssetException) {
        throw error;
      }
      
      try {
        console.log(`Fetching ${coinId} directly from API after error...`);
        const fetchedRates = await this.fetchRatesFromApi([coinId], { vsCurrencies });
        
        if (fetchedRates.length === 0) {
          return null;
        }
        
        try {
          const ratesFile = this.fileManagementService.readJsonFile<RatesFile>(this.ratesFilePath);
          const index = ratesFile.rates.findIndex(rate => rate.id === coinId);
          
          if (index !== -1) {
            ratesFile.rates[index] = fetchedRates[0];
          } else {
            ratesFile.rates.push(fetchedRates[0]);
          }
          
          ratesFile.globalLastUpdated = new Date().toISOString();
          this.fileManagementService.writeJsonFile(this.ratesFilePath, ratesFile);
        } catch (fileError: unknown) {
          console.error('Error updating rates file:', fileError instanceof Error ? fileError.message : String(fileError));
        }
        
        return fetchedRates[0];
      } catch (fetchError: unknown) {
        console.error(`Error fetching ${coinId} directly:`, fetchError instanceof Error ? fetchError.message : String(fetchError));
        return null;
      }
    }
  }
  
  async getRatesByIds(coinIds: string[], options?: RateOptions): Promise<CoinRate[]> {
    const vsCurrencies = options?.vsCurrencies || 'usd';
    const requestedCurrencies = vsCurrencies.split(',');
    
    try {
      let ratesFile = this.fileManagementService.readJsonFile<RatesFile>(this.ratesFilePath);
      const now = new Date();
      
      const cachedRateIds = ratesFile.rates.map(r => r.id);
      const missingCoinIds = coinIds.filter(id => !cachedRateIds.includes(id));
      
      let fetchedNewCoins = false;
      if (missingCoinIds.length > 0) {
        console.log(`Fetching new coins: ${missingCoinIds.join(', ')}`);
        try {
          const newRates = await this.fetchRatesFromApi(missingCoinIds, { vsCurrencies });
          if (newRates.length > 0) {
            ratesFile.rates = [...ratesFile.rates, ...newRates];
            fetchedNewCoins = true;
            console.log(`Successfully fetched ${newRates.length} new coin rates`);
          }
        } catch (error: unknown) {
          console.error(`Error fetching new coins: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      const cachedRates: CoinRate[] = [];
      const coinsToRefresh: { id: string, currencies: string[] }[] = [];
      
      for (const coinId of coinIds) {
        const cachedRate = ratesFile.rates.find(r => r.id === coinId);
        
        if (cachedRate && !this.isRateStale(cachedRate)) {
          const hasMissingCurrencies = requestedCurrencies.some(
            currency => !cachedRate.currencyRateMap || cachedRate.currencyRateMap[currency] === undefined
          );
          
          if (hasMissingCurrencies) {
            const existingCurrencies = cachedRate.currencyRateMap ? 
              Object.keys(cachedRate.currencyRateMap) : [];
            
            coinsToRefresh.push({
              id: coinId,
              currencies: [...new Set([...existingCurrencies, ...requestedCurrencies])]
            });
          } else {
            cachedRates.push(cachedRate);
            console.log(`Not refreshing for coins: ${coinId}`);
          }
        } else if (cachedRate && this.isRateStale(cachedRate)) {
          const existingCurrencies = cachedRate.currencyRateMap ? 
            Object.keys(cachedRate.currencyRateMap) : [];
          
          coinsToRefresh.push({
            id: coinId,
            currencies: [...new Set([...existingCurrencies, ...requestedCurrencies])]
          });
        }
      }
      
      // Refresh any stale coins or coins missing currencies
      if (coinsToRefresh.length > 0) {
        const idsToRefresh = coinsToRefresh.map(c => c.id);
        console.log(`Refreshing stale or incomplete data for coins: ${idsToRefresh.join(', ')}`);
        
        try {
          // Need to fetch all the requested currencies
          const freshRates = await this.fetchRatesFromApi(
            idsToRefresh, 
            { vsCurrencies }
          );
          
          if (freshRates.length > 0) {
            for (const freshRate of freshRates) {
              const index = ratesFile.rates.findIndex(r => r.id === freshRate.id);
              
              if (index !== -1) {
                // Merge existing rate with fresh data
                ratesFile.rates[index] = {
                  ...ratesFile.rates[index],
                  currencyRateMap: {
                    ...ratesFile.rates[index].currencyRateMap,
                    ...freshRate.currencyRateMap
                  },
                  lastUpdated: now.toISOString()
                };
              }
            }
            
            ratesFile.globalLastUpdated = now.toISOString();
            this.fileManagementService.writeJsonFile(this.ratesFilePath, ratesFile);
          }
        } catch (error: unknown) {
          console.error(`Error refreshing stale or incomplete data: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      if (fetchedNewCoins) {
        ratesFile.globalLastUpdated = now.toISOString();
        this.fileManagementService.writeJsonFile(this.ratesFilePath, ratesFile);
      }
      
      return ratesFile.rates.filter(rate => coinIds.includes(rate.id));
      
    } catch (error: unknown) {
      console.error(`Error fetching rates by IDs: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  private isRateStale(coinRate: CoinRate | undefined): boolean {
    if (!coinRate || !coinRate.lastUpdated) return true;
    
    const lastUpdated = new Date(coinRate.lastUpdated);
    const now = new Date();
    return now.getTime() - lastUpdated.getTime() > APP_SETTINGS.CACHE.TTL_MS;
  }
  
  private async fetchRatesFromApi(coinIds: string[], options?: RateOptions): Promise<CoinRate[]> {
    if (!coinIds || coinIds.length === 0) {
      return [];
    }
    
    const url = `${EXTERNAL_APIS.COINGECKO.BASE_URL}/simple/price`;
    const headers = { 'x-cg-api-key': EXTERNAL_APIS.COINGECKO.API_KEY };
    
    const vsCurrencies = options?.vsCurrencies || 'usd';
    
    const params = {
      ids: coinIds.join(','),
      vs_currencies: vsCurrencies,
      include_last_updated_at: true
    };
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers, params })
      );
      console.log(response.data);
      
      if (!response.data || Object.keys(response.data).length === 0) {
        throw new InvalidAssetException(coinIds.join(', '), 'Coin(s) not found in CoinGecko');
      }
      
      const returnedCoinIds = Object.keys(response.data);
      const missingCoinIds = coinIds.filter(id => !returnedCoinIds.includes(id));
      
      if (missingCoinIds.length > 0) {
        throw new InvalidAssetException(missingCoinIds.join(', '), 'Coin(s) not found in CoinGecko');
      }
      
      return Object.entries(response.data).map(([id, data]: [string, any]) => {
        const currencies = vsCurrencies.split(',');
        
        const currencyRateMap: { [key: string]: number } = {};
        
        currencies.forEach(currency => {
          if (data[currency] !== undefined) {
            currencyRateMap[currency] = data[currency];
          }
        });
        
        return {
          id,
          currencyRateMap,
          lastUpdated: data.last_updated_at 
            ? new Date(data.last_updated_at * 1000).toISOString() 
            : new Date().toISOString()
        };
      });
    } catch (error: unknown) {
      console.error(`Error fetching rates: ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        throw new RateLimitExceededException('CoinGecko');
      }
      
      if (error instanceof InvalidAssetException) {
        throw error;
      }
      
      if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
        throw new InvalidAssetException(coinIds.join(', '), 'Asset not found in CoinGecko');
      }
      
      throw error;
    }
  }
} 