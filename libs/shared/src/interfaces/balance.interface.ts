export interface Balance {
  balanceId: string;
  walletId: string;
  asset: string;
  amount: number;
  lastUpdated: string | Date;
  assetMetadata?: {
    symbol?: string;
    name?: string;
    decimals?: number;
  };
} 