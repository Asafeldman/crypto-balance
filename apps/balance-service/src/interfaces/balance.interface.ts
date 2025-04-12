export interface Balance {
  balanceId: string;
  walletId: string;
  asset: string;
  amount: number;
  lastUpdated: string;
}

export interface BalancesFile {
  balances: Balance[];
} 