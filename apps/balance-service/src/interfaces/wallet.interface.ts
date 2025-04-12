export interface Wallet {
  walletId: string;
  userId: string;
  name?: string;
  createdAt: string;
}

export interface WalletsFile {
  wallets: Wallet[];
} 