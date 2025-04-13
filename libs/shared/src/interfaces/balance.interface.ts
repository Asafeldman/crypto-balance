export interface Balance {
  balanceId: string;
  userId: string;
  asset: string;
  amount: number;
  lastUpdated: string | Date;
  assetMetadata?: {
    symbol?: string;
    name?: string;
    decimals?: number;
  };
}

export interface BalancesFile {
  balances: Balance[];
} 