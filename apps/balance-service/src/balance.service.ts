import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FileManagementService } from '../../../libs/shared/src/file-management/file-management.service';
import { Balance, BalancesFile } from '../../../libs/shared/src/interfaces/balance.interface';
import { randomUUID } from 'crypto';
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
    amount: number
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
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error adding balance: ${error.message}`);
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
      
      if (balance.userId !== userId) {
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

      const rateMap: Record<string, number> = {};
      
      if (response.data && Array.isArray(response.data)) {
        for (const rate of response.data) {
          if (rate.id && rate.currencyRateMap && rate.currencyRateMap[currency.toLowerCase()]) {
            rateMap[rate.id] = rate.currencyRateMap[currency.toLowerCase()];
          }
        }
      }

      return rateMap;
    } catch (error) {
      console.error(`Error fetching rates from rate service: ${error.message}`);
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
    } catch (error) {
      console.error(`Error validating asset ${assetId}: ${error.message}`);
      return false;
    }
  }

  async rebalance(
    userId: string,
    targetPercentages: Record<string, number>
  ): Promise<Balance[]> {
    try {
      // Validate user exists
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

      // Validate all asset IDs are valid
      const assets = Object.keys(targetPercentages);
      if (assets.length === 0) {
        throw new BadRequestException('Target percentages must include at least one asset');
      }

      // Validate target percentages add up to 100%
      const totalPercentage = Object.values(targetPercentages).reduce((sum, percentage) => sum + percentage, 0);
      if (totalPercentage !== 100) {
        throw new BadRequestException(`Target percentages must add up to exactly 100%, got ${totalPercentage}%`);
      }

      // Validate target percentages are all positive
      for (const [asset, percentage] of Object.entries(targetPercentages)) {
        if (percentage < 0) {
          throw new BadRequestException(`Target percentage for ${asset} must be positive, got ${percentage}%`);
        }
      }

      // Validate each asset name with CoinGecko
      for (const asset of assets) {
        const isValidAsset = await this.validateAsset(asset);
        if (!isValidAsset) {
          throw new BadRequestException(`Invalid asset: ${asset}`);
        }
      }

      // Get current balances
      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      let userBalances = balancesData.balances.filter(
        balance => balance.userId === userId
      );

      // Calculate total portfolio value using existing method
      const portfolioValue = await this.getTotalBalance(userId);
      
      if (portfolioValue.total === 0) {
        throw new BadRequestException('User has no assets with known values');
      }

      // Get rates for all assets (current + target)
      const currentAssets = [...new Set(userBalances.map(balance => balance.asset))];
      const allAssets = [...new Set([...currentAssets, ...assets])];
      const rates = await this.getRatesForAssets(allAssets);
      
      // Check if rates are available for all target assets
      const missingRates = assets.filter(asset => !rates[asset]);
      if (missingRates.length > 0) {
        throw new BadRequestException(
          `Cannot rebalance portfolio: Missing rates for the following assets: ${missingRates.join(', ')}`
        );
      }

      // Calculate target value for each asset
      const targetValues: Record<string, number> = {};
      for (const [asset, percentage] of Object.entries(targetPercentages)) {
        targetValues[asset] = portfolioValue.total * (percentage / 100);
      }

      // Adjust holdings to match target percentages
      const now = new Date().toISOString();

      // Remove assets that should be completely sold (0% target)
      userBalances = userBalances.filter(balance => {
        const assetPercentage = targetPercentages[balance.asset];
        return assetPercentage !== undefined && assetPercentage > 0;
      });

      // We'll track the updated balances
      const updatedBalances: Record<string, Balance> = {};

      // Update existing balances and create new ones
      for (const [asset, targetValue] of Object.entries(targetValues)) {
        if (targetValue <= 0) continue; // Skip assets with 0% target

        const rate = rates[asset];
        const targetAmount = targetValue / rate;
        
        // Find existing balance for this asset
        const existingBalance = userBalances.find(b => b.asset === asset);
        
        if (existingBalance) {
          // Update existing balance
          existingBalance.amount = targetAmount;
          existingBalance.lastUpdated = now;
          updatedBalances[asset] = existingBalance;
        } else {
          // Create new balance
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

      // Update the balances file
      const updatedBalanceIds = new Set(Object.values(updatedBalances).map(b => b.balanceId));
      
      // Remove balances that are no longer needed
      balancesData.balances = balancesData.balances.filter(b => {
        // Keep if it's not this user's balance or if it's in the updated balances
        return b.userId !== userId || updatedBalanceIds.has(b.balanceId);
      });
      
      // Add updated and new balances
      for (const balance of Object.values(updatedBalances)) {
        const existingIndex = balancesData.balances.findIndex(b => b.balanceId === balance.balanceId);
        if (existingIndex >= 0) {
          balancesData.balances[existingIndex] = balance;
        } else {
          balancesData.balances.push(balance);
        }
      }
      
      // Save the updated balances
      this.fileManagementService.writeJsonFile(this.balancesFilePath, balancesData);
      
      // Return the user's updated balances
      return Object.values(updatedBalances);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error rebalancing portfolio: ${error.message}`);
      throw new BadRequestException(`Failed to rebalance portfolio: ${error.message}`);
    }
  }

  async getPortfolioAllocation(userId: string): Promise<Record<string, number>> {
    try {
      // Validate user exists
      const userExists = await this.validateUserExists(userId);
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} does not exist`);
      }

      // Get current balances
      const balancesData = this.fileManagementService.readJsonFile<BalancesFile>(this.balancesFilePath);
      const userBalances = balancesData.balances.filter(
        balance => balance.userId === userId
      );

      if (userBalances.length === 0) {
        return {};
      }

      // Get unique assets
      const assets = [...new Set(userBalances.map(balance => balance.asset))];
      
      // Get rates for all assets
      const rates = await this.getRatesForAssets(assets);
      if (Object.keys(rates).length === 0) {
        throw new BadRequestException('Could not fetch rates for the user assets');
      }

      // Calculate total portfolio value
      let totalPortfolioValue = 0;
      const assetValues: Record<string, number> = {};

      // Calculate value for each asset
      for (const balance of userBalances) {
        const rate = rates[balance.asset];
        if (rate) {
          const assetValue = balance.amount * rate;
          assetValues[balance.asset] = (assetValues[balance.asset] || 0) + assetValue;
          totalPortfolioValue += assetValue;
        }
      }

      // Handle case where no assets have valid rates
      if (totalPortfolioValue === 0) {
        return {};
      }

      // Calculate percentages
      const percentages: Record<string, number> = {};
      for (const [asset, value] of Object.entries(assetValues)) {
        // Round to 2 decimal places
        percentages[asset] = Math.round((value / totalPortfolioValue) * 10000) / 100;
      }

      return percentages;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Error calculating portfolio allocation: ${error.message}`);
      throw new BadRequestException(`Failed to calculate portfolio allocation: ${error.message}`);
    }
  }
}


