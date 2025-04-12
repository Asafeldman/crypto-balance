import { Injectable, NotFoundException } from '@nestjs/common';
import { FileManagementService } from '../../../libs/shared/src/file-management/file-management.service';
import { Balance } from '../../../libs/shared/src/interfaces/balance.interface';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { BalancesFile } from './interfaces/balance.interface';
import { User, UsersFile } from './interfaces/user.interface';
import { Wallet, WalletsFile } from './interfaces/wallet.interface';

@Injectable()
export class BalanceService {
  private readonly usersFilePath: string;
  private readonly walletsFilePath: string;
  private readonly balancesFilePath: string;

  constructor(private readonly fileManagementService: FileManagementService) {
    this.usersFilePath = this.resolveDataPath('users.json');
    this.walletsFilePath = this.resolveDataPath('wallets.json');
    this.balancesFilePath = this.resolveDataPath('balances.json');
    this.ensureDataFilesExist();
  }
  
  private resolveDataPath(filename: string): string {
    const sharedPath = path.resolve(process.cwd(), 'libs/shared/src/file-management/data', filename);
    if (fs.existsSync(sharedPath)) {
      return sharedPath;
    }
    
    const distPath = path.resolve(process.cwd(), 'dist/libs/shared/file-management/data', filename);
    if (fs.existsSync(distPath)) {
      return distPath;
    }
    
    return path.resolve(__dirname, '../../../libs/shared/src/file-management/data', filename);
  }
  
  private ensureDataFilesExist(): void {
    try {
      const distDir = path.resolve(process.cwd(), 'dist/libs/shared/file-management/data');
      
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      
      const files = ['users.json', 'wallets.json', 'balances.json'];
      
      for (const file of files) {
        const srcPath = path.resolve(process.cwd(), 'libs/shared/src/file-management/data', file);
        const distPath = path.resolve(distDir, file);
        
        if (fs.existsSync(srcPath) && !fs.existsSync(distPath)) {
          const data = fs.readFileSync(srcPath);
          fs.writeFileSync(distPath, data);
        }
        else if (!fs.existsSync(distPath)) {
          const emptyContent = file === 'users.json' 
            ? '{"users":[]}' 
            : file === 'wallets.json' 
              ? '{"wallets":[]}' 
              : '{"balances":[]}';
          
          fs.writeFileSync(distPath, emptyContent);
        }
      }
    } catch (error) {
      console.error(`Error ensuring data files exist: ${error.message}`);
    }
  }

  // TODO: After user-service implementation, this should call the user-service API instead of direct file access
  getUserWallets(userId: string): string[] {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      const user = usersData.users.find(u => u.userId === userId);
      
      if (!user) {
        return [];
      }
      
      return user.walletIds;
    } catch (error) {
      console.error(`Error reading user wallets: ${error.message}`);
      return [];
    }
  }

  getBalances(userId: string): Balance[] {
    try {
      const walletIds = this.getUserWallets(userId);
      
      if (walletIds.length === 0) {
        return [];
      }

      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const userBalances = balancesData.balances.filter(
        balance => walletIds.includes(balance.walletId)
      );

      return userBalances.map(balance => ({
        ...balance,
        assetMetadata: {
          symbol: balance.asset
        }
      }));
    } catch (error) {
      console.error(`Error reading balances: ${error.message}`);
      return [];
    }
  }

  getBalanceById(userId: string, balanceId: string): Balance | null {
    try {
      const walletIds = this.getUserWallets(userId);
      
      if (walletIds.length === 0) {
        return null;
      }
      
      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const balance = balancesData.balances.find(b => b.balanceId === balanceId);
      
      if (!balance || !walletIds.includes(balance.walletId)) {
        return null;
      }
      
      return {
        ...balance,
        assetMetadata: {
          symbol: balance.asset
        }
      };
    } catch (error) {
      console.error(`Error finding balance: ${error.message}`);
      return null;
    }
  }

  // TODO: Refactor this method - User creation should move to user-service, but wallet creation should remain in balance-service
  createUserWithWallet(userName: string, email: string, walletName: string): { userId: string; walletId: string } {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      const walletsData = this.fileManagementService.readJsonFile<WalletsFile>(this.walletsFilePath);
      
      const userId = randomUUID();
      const walletId = randomUUID();
      const now = new Date().toISOString();
      
      usersData.users.push({
        userId,
        walletIds: [walletId],
        userName,
        email
      });
      
      walletsData.wallets.push({
        walletId,
        userId,
        name: walletName,
        createdAt: now
      });
      
      this.fileManagementService.writeJsonFile(this.usersFilePath, usersData);
      this.fileManagementService.writeJsonFile(this.walletsFilePath, walletsData);
      
      return { userId, walletId };
    } catch (error) {
      console.error(`Error creating user wallet: ${error.message}`);
      throw new Error('Could not create user wallet');
    }
  }

  async addBalance(
    userId: string,
    asset: string,
    amount: number,
    walletId: string,
  ): Promise<Balance | null> {
    try {
      const walletIds = await this.getUserWallets(userId);

      if (walletIds.length === 0) {
        return null;
      }

      if (!walletIds.includes(walletId)) {
        return null; 
      }

      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const existingBalanceIndex = balancesData.balances.findIndex(
        b => b.walletId === walletId && b.asset === asset
      );
      
      const now = new Date().toISOString();
      
      if (existingBalanceIndex >= 0) {
        balancesData.balances[existingBalanceIndex].amount += amount;
        balancesData.balances[existingBalanceIndex].lastUpdated = now;
        
        this.fileManagementService.writeJsonFile(this.balancesFilePath, balancesData);
        
        return {
          ...balancesData.balances[existingBalanceIndex],
          assetMetadata: {
            symbol: asset
          }
        };
      } else {
        const newBalance = {
          balanceId: randomUUID(),
          walletId,
          asset,
          amount,
          lastUpdated: now
        };
        
        balancesData.balances.push(newBalance);
        this.fileManagementService.writeJsonFile(this.balancesFilePath, balancesData);
        
        return {
          ...newBalance,
          assetMetadata: {
            symbol: asset
          }
        };
      }
    } catch (error) {
      console.error(`Error adding balance: ${error.message}`);
      return null;
    }
  }

  updateBalance(userId: string, balanceId: string, amount: number): Balance | null {
    try {
      const walletIds = this.getUserWallets(userId);
      
      if (walletIds.length === 0) {
        return null;
      }
      
      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const balanceIndex = balancesData.balances.findIndex(b => b.balanceId === balanceId);
      
      if (balanceIndex === -1) {
        return null;
      }
      
      const balance = balancesData.balances[balanceIndex];
      
      if (!walletIds.includes(balance.walletId)) {
        return null;
      }
      
      balancesData.balances[balanceIndex].amount = amount;
      balancesData.balances[balanceIndex].lastUpdated = new Date().toISOString();
      
      this.fileManagementService.writeJsonFile(this.balancesFilePath, balancesData);
      
      return {
        ...balancesData.balances[balanceIndex],
        assetMetadata: {
          symbol: balance.asset
        }
      };
    } catch (error) {
      console.error(`Error updating balance: ${error.message}`);
      return null;
    }
  }

  removeBalance(userId: string, balanceId: string): string | null {
    try {
      const walletIds = this.getUserWallets(userId);
      
      if (walletIds.length === 0) {
        return null;
      }
      
      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const balanceIndex = balancesData.balances.findIndex(b => b.balanceId === balanceId);
      
      if (balanceIndex === -1) {
        return null;
      }
      
      const balance = balancesData.balances[balanceIndex];
      if (!walletIds.includes(balance.walletId)) {
        return null;
      }
      
      balancesData.balances.splice(balanceIndex, 1);
      this.fileManagementService.writeJsonFile(this.balancesFilePath, balancesData);
      
      return balanceId;
    } catch (error) {
      console.error(`Error removing balance: ${error.message}`);
      return null;
    }
  }
}


