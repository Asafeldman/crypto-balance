import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FileManagementService } from '../../../libs/shared/src/file-management/file-management.service';
import { Balance } from '../../../libs/shared/src/interfaces/balance.interface';
import { randomUUID } from 'crypto';
import { BalancesFile } from './interfaces/balance.interface';

@Injectable()
export class BalanceService {
  private readonly balancesFilePath: string;
  private readonly userServiceUrl = 'http://localhost:3002/users';

  constructor(
    private readonly fileManagementService: FileManagementService,
    private readonly httpService: HttpService
  ) {
    this.balancesFilePath = this.fileManagementService.resolveDataPath('balances.json');
    this.fileManagementService.ensureDataFilesExist([
      { filename: 'balances.json', emptyContent: '{"balances":[]}' }
    ]);
  }

  async getUserWallets(userId: string): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/${userId}/wallets`)
      );
      return response.data.map(wallet => wallet.walletId);
    } catch (error) {
      console.error(`Error getting wallets for user ${userId}: ${error.message}`);
      return [];
    }
  }

  async getBalances(userId: string): Promise<Balance[]> {
    try {
      const walletIds = await this.getUserWallets(userId);
      
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

  async getBalanceById(userId: string, balanceId: string): Promise<Balance | null> {
    try {
      const walletIds = await this.getUserWallets(userId);
      
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

  async updateBalance(userId: string, balanceId: string, amount: number, walletId: string): Promise<Balance | null> {
    try {
      const walletIds = await this.getUserWallets(userId);
      
      if (walletIds.length === 0) {
        return null;
      }
      
      if (!walletIds.includes(walletId)) {
        return null;
      }
      
      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const balanceIndex = balancesData.balances.findIndex(b => b.balanceId === balanceId);
      
      if (balanceIndex === -1) {
        return null;
      }
      
      const balance = balancesData.balances[balanceIndex];
      
      if (balance.walletId !== walletId) {
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

  async removeBalance(userId: string, balanceId: string): Promise<string | null> {
    try {
      const walletIds = await this.getUserWallets(userId);
      
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


