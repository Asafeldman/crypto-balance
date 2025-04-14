import { Injectable, BadRequestException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FileManagementService } from '../../../libs/shared/src/file-management/file-management.service';
import { Balance, BalancesFile } from '../../../libs/shared/src/interfaces/balance.interface';
import { randomUUID } from 'crypto';
import { EXTERNAL_APIS, SERVICES } from '../../../libs/shared/src/constants';
import {
  InvalidAssetException,
  PortfolioValidationException,
  RateLimitExceededException
} from '../../../libs/shared/src/error-handling/exceptions';

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
    } catch (error: unknown) {
      console.error(`Error validating user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async getBalances(userId: string): Promise<Balance[]> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const userBalances = balancesData.balances.filter(
        balance => balance.userId === userId
      );

      return userBalances.map(balance => ({
        ...balance,
        assetMetadata: {
          symbol: balance.asset
        }
      }));
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error reading balances: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getBalanceById(userId: string, balanceId: string): Promise<Balance | null> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }
      
      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const balance = balancesData.balances.find(b => b.balanceId === balanceId);
      
      if (!balance) {
        throw new NotFoundException(`Balance with ID ${balanceId} not found`);
      }
      
      if (balance.userId !== userId) {
        throw new BadRequestException(`Balance with ID ${balanceId} does not belong to user ${userId}`);
      }
      
      return {
        ...balance,
        assetMetadata: {
          symbol: balance.asset
        }
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error(`Error finding balance: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async addBalance(
    userId: string,
    asset: string,
    amount: number
  ): Promise<Balance | null> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

      const isValidAsset = await this.validateAsset(asset);
      if (!isValidAsset) {
        throw new InvalidAssetException(asset);
      }

      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const existingBalanceIndex = balancesData.balances.findIndex(
        b => b.userId === userId && b.asset === asset
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
          userId,
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
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error adding balance: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async updateBalance(userId: string, balanceId: string, amount: number): Promise<Balance | null> {
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
      
      if (balance.userId !== userId) {
        throw new BadRequestException(`Balance with ID ${balanceId} does not belong to user ${userId}`);
      }
      
      if (amount < 0) {
        throw new BadRequestException('Amount must be non-negative');
      }
      
      balance.amount = amount;
      balance.lastUpdated = new Date().toISOString();
      
      balancesData.balances[balanceIndex] = balance;
      this.fileManagementService.writeJsonFile(this.balancesFilePath, balancesData);
      
      return {
        ...balance,
        assetMetadata: {
          symbol: balance.asset
        }
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error updating balance: ${error instanceof Error ? error.message : String(error)}`);
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
      
      if (balance.userId !== userId) {
        throw new BadRequestException(`Balance with ID ${balanceId} does not belong to user ${userId}`);
      }
      
      balancesData.balances.splice(balanceIndex, 1);
      this.fileManagementService.writeJsonFile(this.balancesFilePath, balancesData);
      
      return balanceId;
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error removing balance: ${error instanceof Error ? error.message : String(error)}`);
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
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error calculating total balance: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(`Failed to calculate total balance: ${error instanceof Error ? error.message : String(error)}`);
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

      const rateMap: Record<string, number> = {};
      
      if (response.data && Array.isArray(response.data)) {
        for (const rate of response.data) {
          if (rate.id && rate.currencyRateMap && rate.currencyRateMap[currency.toLowerCase()]) {
            rateMap[rate.id] = rate.currencyRateMap[currency.toLowerCase()];
          }
        }
      }

      return rateMap;
    } catch (error: unknown) {
      console.error(`Error fetching rates from rate service: ${error instanceof Error ? error.message : String(error)}`);
      return {};
    }
  }

  async validateAsset(assetId: string): Promise<boolean> {
    try {
      const headers = { 'x-cg-api-key': EXTERNAL_APIS.COINGECKO.API_KEY };
      await firstValueFrom(
        this.httpService.get(`${EXTERNAL_APIS.COINGECKO.BASE_URL}/coins/${assetId}`, { headers })
      );
      return true;
    } catch (error: unknown) {
      console.error(`Error validating asset ${assetId}: ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof HttpException && error.getStatus() === 404) {
        return false;
      }
      
      if (error instanceof HttpException && error.getStatus() === 429) {
        throw new RateLimitExceededException('CoinGecko');
      }
      
      throw error;
    }
  }

  async rebalance(
    userId: string,
    targetPercentages: Record<string, number>
  ): Promise<Balance[]> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

      const assets = Object.keys(targetPercentages);
      if (assets.length === 0) {
        throw new PortfolioValidationException('Target percentages must include at least one asset');
      }

      const totalPercentage = Object.values(targetPercentages).reduce((sum, percentage) => sum + percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new PortfolioValidationException(`Target percentages must add up to exactly 100%, got ${totalPercentage}%`);
      }

      for (const [asset, percentage] of Object.entries(targetPercentages)) {
        if (percentage <= 0) {
          throw new PortfolioValidationException(`Target percentage for ${asset} must be positive, got ${percentage}%`);
        }
        
        const isValidAsset = await this.validateAsset(asset);
        if (!isValidAsset) {
          throw new InvalidAssetException(asset);
        }
      }

      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      let userBalances = balancesData.balances.filter(
        balance => balance.userId === userId
      );

      const portfolioValue = await this.getTotalBalance(userId);
      
      if (portfolioValue.total === 0) {
        throw new BadRequestException('User has no assets with known values');
      }

      const currentAssets = [...new Set(userBalances.map(balance => balance.asset))];
      const allAssets = [...new Set([...currentAssets, ...assets])];
      const rates = await this.getRatesForAssets(allAssets);
      
      const missingRates = assets.filter(asset => !rates[asset]);
      if (missingRates.length > 0) {
        throw new BadRequestException(
          `Cannot rebalance portfolio: Missing rates for the following assets: ${missingRates.join(', ')}`
        );
      }

      const targetValues: Record<string, number> = {};
      for (const [asset, percentage] of Object.entries(targetPercentages)) {
        targetValues[asset] = portfolioValue.total * (percentage / 100);
      }

      const now = new Date().toISOString();

      userBalances = userBalances.filter(balance => {
        const assetPercentage = targetPercentages[balance.asset];
        return assetPercentage !== undefined && assetPercentage > 0;
      });

      const updatedBalances: Record<string, Balance> = {};

      for (const [asset, targetValue] of Object.entries(targetValues)) {
        if (targetValue <= 0) continue; // Skip assets with 0% target

        const rate = rates[asset];
        const targetAmount = targetValue / rate;
        
        const existingBalance = userBalances.find(b => b.asset === asset);
        
        if (existingBalance) {
          existingBalance.amount = targetAmount;
          existingBalance.lastUpdated = now;
          updatedBalances[asset] = existingBalance;
        } else {
          const newBalance: Balance = {
            balanceId: randomUUID(),
            userId,
            asset,
            amount: targetAmount,
            lastUpdated: now,
            assetMetadata: {
              symbol: asset
            }
          };
          updatedBalances[asset] = newBalance;
        }
      }

      const updatedBalanceIds = new Set(Object.values(updatedBalances).map(b => b.balanceId));
      
      balancesData.balances = balancesData.balances.filter(b => {
        return b.userId !== userId || updatedBalanceIds.has(b.balanceId);
      });
      
      for (const balance of Object.values(updatedBalances)) {
        const existingIndex = balancesData.balances.findIndex(b => b.balanceId === balance.balanceId);
        if (existingIndex >= 0) {
          balancesData.balances[existingIndex] = balance;
        } else {
          balancesData.balances.push(balance);
        }
      }
      
      this.fileManagementService.writeJsonFile(this.balancesFilePath, balancesData);
      
      return Object.values(updatedBalances);
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error rebalancing portfolio: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(`Failed to rebalance portfolio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getPortfolioAllocation(userId: string): Promise<Record<string, number>> {
    try {
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const userBalances = balancesData.balances.filter(
        balance => balance.userId === userId
      );

      if (userBalances.length === 0) {
        return {};
      }

      const assets = [...new Set(userBalances.map(balance => balance.asset))];
      
      const rates = await this.getRatesForAssets(assets);
      if (Object.keys(rates).length === 0) {
        throw new BadRequestException('Could not fetch rates for the user assets');
      }

      let totalPortfolioValue = 0;
      const assetValues: Record<string, number> = {};

      for (const balance of userBalances) {
        const rate = rates[balance.asset];
        if (rate) {
          const assetValue = balance.amount * rate;
          assetValues[balance.asset] = (assetValues[balance.asset] || 0) + assetValue;
          totalPortfolioValue += assetValue;
        }
      }

      if (totalPortfolioValue === 0) {
        return {};
      }

      const percentages: Record<string, number> = {};
      for (const [asset, value] of Object.entries(assetValues)) {
        percentages[asset] = Math.round((value / totalPortfolioValue) * 10000) / 100;
      }

      return percentages;
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error calculating portfolio allocation: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(`Failed to calculate portfolio allocation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}


