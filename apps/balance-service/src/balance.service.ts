import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FileManagementService } from '../../../libs/shared/src/file-management/file-management.service';
import { Balance } from '../../../libs/shared/src/interfaces/balance.interface';
import { randomUUID } from 'crypto';
import { BalancesFile } from './interfaces/balance.interface';
import { EXTERNAL_APIS, SERVICES } from '../../../libs/shared/src/constants';

@Injectable()
export class BalanceService {
  private readonly balancesFilePath: string;
  private readonly userServiceUrl = `${SERVICES.USER.URL}/users`;
  private readonly rateServiceUrl = SERVICES.RATE.URL;

  constructor(
    private readonly fileManagementService: FileManagementService,
    private readonly httpService: HttpService
  ) {
    this.balancesFilePath = this.fileManagementService.resolveDataPath('balances.json');
    this.fileManagementService.ensureDataFilesExist([
      { filename: 'balances.json', emptyContent: '{"balances":[]}' }
    ]);
  }

  async validateUserExists(userId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/${userId}`)
      );
      return !!response.data;
    } catch (error) {
      console.error(`Error validating user ${userId}: ${error.message}`);
      return false;
    }
  }

  async getUserWallets(userId: string): Promise<string[]> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/${userId}/wallets`)
      );
      
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        console.warn(`No wallets found for user ${userId}`);
        return [];
      }
      
      return response.data.map(wallet => wallet.walletId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error getting wallets for user ${userId}: ${error.message}`);
      return [];
    }
  }

  async validateWalletOwnership(userId: string, walletId: string): Promise<boolean> {
    try {
      const wallets = await this.getUserWallets(userId);
      return wallets.includes(walletId);
    } catch (error) {
      console.error(`Error validating wallet ownership: ${error.message}`);
      throw error;
    }
  }

  async validateAsset(assetId: string): Promise<boolean> {
    try {
      const headers = { 'x-cg-api-key': EXTERNAL_APIS.COINGECKO.API_KEY };
      await firstValueFrom(
        this.httpService.get(`${EXTERNAL_APIS.COINGECKO.BASE_URL}/coins/${assetId}`, { headers })
      );
      return true;
    } catch (error) {
      console.error(`Error validating asset ${assetId}: ${error.message}`);
      return false;
    }
  }

  async getBalances(userId: string): Promise<Balance[]> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

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
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error reading balances: ${error.message}`);
      return [];
    }
  }

  async getBalanceById(userId: string, balanceId: string): Promise<Balance | null> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }
      
      const walletIds = await this.getUserWallets(userId);
      
      if (walletIds.length === 0) {
        return null;
      }
      
      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const balance = balancesData.balances.find(b => b.balanceId === balanceId);
      
      if (!balance) {
        throw new NotFoundException(`Balance with ID ${balanceId} not found`);
      }
      
      if (!walletIds.includes(balance.walletId)) {
        throw new BadRequestException(`Balance with ID ${balanceId} does not belong to user ${userId}`);
      }
      
      return {
        ...balance,
        assetMetadata: {
          symbol: balance.asset
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
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
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

      const isValidAsset = await this.validateAsset(asset);
      if (!isValidAsset) {
        throw new BadRequestException(`Invalid asset: ${asset}. Please check the correct name for the asset you're trying to add.`);
      }

      const isWalletOwned = await this.validateWalletOwnership(userId, walletId);
      if (!isWalletOwned) {
        throw new BadRequestException(`Wallet with ID ${walletId} does not belong to user ${userId}`);
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
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error adding balance: ${error.message}`);
      return null;
    }
  }

  async updateBalance(userId: string, balanceId: string, amount: number, walletId: string): Promise<Balance | null> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

      const isWalletOwned = await this.validateWalletOwnership(userId, walletId);
      if (!isWalletOwned) {
        throw new BadRequestException(`Wallet with ID ${walletId} does not belong to user ${userId}`);
      }
      
      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const balanceIndex = balancesData.balances.findIndex(b => b.balanceId === balanceId);
      
      if (balanceIndex === -1) {
        throw new NotFoundException(`Balance with ID ${balanceId} not found`);
      }
      
      const balance = balancesData.balances[balanceIndex];
      
      if (balance.walletId !== walletId) {
        throw new BadRequestException(`Balance with ID ${balanceId} does not belong to wallet ${walletId}`);
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
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error updating balance: ${error.message}`);
      return null;
    }
  }

  async removeBalance(userId: string, balanceId: string): Promise<string | null> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }
      
      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const balanceIndex = balancesData.balances.findIndex(b => b.balanceId === balanceId);
      
      if (balanceIndex === -1) {
        throw new NotFoundException(`Balance with ID ${balanceId} not found`);
      }
      
      const balance = balancesData.balances[balanceIndex];
      
      const walletIds = await this.getUserWallets(userId);
      if (!walletIds.includes(balance.walletId)) {
        throw new BadRequestException(`Balance with ID ${balanceId} does not belong to user ${userId}`);
      }
      
      balancesData.balances.splice(balanceIndex, 1);
      this.fileManagementService.writeJsonFile(this.balancesFilePath, balancesData);
      
      return balanceId;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error removing balance: ${error.message}`);
      return null;
    }
  }

  async getTotalBalance(userId: string, currency: string = 'usd'): Promise<{ total: number; currency: string }> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

      const balances = await this.getBalances(userId);
      
      if (balances.length === 0) {
        return { total: 0, currency };
      }

      const uniqueAssets = [...new Set(balances.map(balance => balance.asset))];
      
      const rates = await this.getRatesForAssets(uniqueAssets, currency);
      
      if (Object.keys(rates).length === 0) {
        throw new BadRequestException(`Could not fetch rates for the specified assets in ${currency}`);
      }

      let totalValue = 0;
      
      for (const balance of balances) {
        const rate = rates[balance.asset];
        if (rate) {
          totalValue += balance.amount * rate;
        } else {
          console.warn(`No rate found for asset ${balance.asset} in ${currency}`);
        }
      }

      return {
        total: totalValue,
        currency: currency.toLowerCase()
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error calculating total balance: ${error.message}`);
      throw new BadRequestException(`Failed to calculate total balance: ${error.message}`);
    }
  }

  private async getRatesForAssets(assetIds: string[], currency: string = 'usd'): Promise<Record<string, number>> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.rateServiceUrl}/rates`, {
          params: {
            ids: assetIds.join(','),
            vs_currencies: currency
          }
        })
      );

      if (!response.data || !Array.isArray(response.data)) {
        return {};
      }

      const rateMap: Record<string, number> = {};
      
      for (const rate of response.data) {
        if (rate.id && rate.currencyRateMap && rate.currencyRateMap[currency.toLowerCase()]) {
          rateMap[rate.id] = rate.currencyRateMap[currency.toLowerCase()];
        }
      }

      return rateMap;
    } catch (error) {
      console.error(`Error fetching rates from rate service: ${error.message}`);
      return {};
    }
  }
}


