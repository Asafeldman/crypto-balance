export interface CurrencyRateMap {
  [currency: string]: number;
}

export interface RateOptions {
  vsCurrencies: string;
}

export interface CoinRate {
  id: string;
  currencyRateMap: CurrencyRateMap;
  lastUpdated: string; 
}

export interface RatesFile {
  rates: CoinRate[];
  globalLastUpdated: string; 
} 