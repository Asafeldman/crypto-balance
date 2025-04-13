export interface CurrencyRateMap {
  [currency: string]: number;
}

export interface RateOptions {
  vsCurrencies: string;
}

export interface CoinRate {
  id: string;
  name: string;
  symbol: string;
  currencyRateMap: CurrencyRateMap;
  lastUpdated: string; // ISO format timestamp for this coin's rates
}

export interface RatesFile {
  rates: CoinRate[];
  globalLastUpdated: string; // ISO format timestamp for the entire file
} 