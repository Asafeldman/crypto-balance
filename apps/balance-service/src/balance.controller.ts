import { Body, Controller, Delete, Get, Headers, NotFoundException, BadRequestException, Param, Post, Put, Query } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { Balance } from '../../../libs/shared/src/interfaces/balance.interface';
import { AddBalanceDto } from './dto/add-balance.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { RebalanceDto } from './dto/rebalance.dto';

@Controller('balances')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('total')
  async getTotalBalance(
    @Headers('X-User-ID') userId: string,
    @Query('currency') currency: string = 'usd'
  ): Promise<{ total: number; currency: string }> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    try {
      return await this.balanceService.getTotalBalance(userId, currency.toLowerCase());
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Error calculating total balance: ${error.message}`);
    }
  }

  @Get('allocation')
  async getPortfolioAllocation(
    @Headers('X-User-ID') userId: string
  ): Promise<Record<string, number>> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    try {
      return await this.balanceService.getPortfolioAllocation(userId);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to calculate portfolio allocation: ${error.message}`);
    }
  }

  @Get()
  async getBalances(@Headers('X-User-ID') userId: string): Promise<Balance[]> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    try {
      return await this.balanceService.getBalances(userId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException('Error fetching balances');
    }
  }

  @Get(':balanceId')
  async getBalanceById(
    @Headers('X-User-ID') userId: string,
    @Param('balanceId') balanceId: string,
  ): Promise<Balance> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    try {
      const balance = await this.balanceService.getBalanceById(userId, balanceId);
      
      if (!balance) {
        throw new NotFoundException(`Balance with ID ${balanceId} not found or doesn't belong to user ${userId}`);
      }
      
      return balance;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException(`Error fetching balance with ID ${balanceId}`);
    }
  }

  @Post('rebalance')
  async rebalance(
    @Headers('X-User-ID') userId: string,
    @Body() rebalanceDto: RebalanceDto
  ): Promise<Balance[]> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    try {
      return await this.balanceService.rebalance(
        userId, 
        rebalanceDto.targetPercentages
      );
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to rebalance portfolio: ${error.message}`);
    }
  }

  @Post()
  async addBalance(
    @Headers('X-User-ID') userId: string,
    @Body() addBalanceDto: AddBalanceDto,
  ): Promise<Balance> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    const { asset, amount } = addBalanceDto;
    
    try {
      const balance = await this.balanceService.addBalance(userId, asset, amount);
      
      if (!balance) {
        throw new NotFoundException(`Failed to add balance for user ${userId}`);
      }
      
      return balance;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to add balance for user ${userId}: ${error.message}`);
    }
  }

  @Put(':balanceId')
  async updateBalance(
    @Headers('X-User-ID') userId: string,
    @Param('balanceId') balanceId: string,
    @Body() updateBalanceDto: UpdateBalanceDto,
  ): Promise<Balance> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    try {
      const balance = await this.balanceService.updateBalance(
        userId, 
        balanceId, 
        updateBalanceDto.amount
      );
      
      if (!balance) {
        throw new NotFoundException(`Balance with ID ${balanceId} not found or doesn't belong to user ${userId}`);
      }
      
      return balance;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to update balance with ID ${balanceId}: ${error.message}`);
    }
  }

  @Delete(':balanceId')
  async removeBalance(
    @Headers('X-User-ID') userId: string,
    @Param('balanceId') balanceId: string,
  ): Promise<{ balanceId: string }> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    try {
      const removedBalanceId = await this.balanceService.removeBalance(userId, balanceId);
      
      if (!removedBalanceId) {
        throw new NotFoundException(`Balance with ID ${balanceId} not found or doesn't belong to user ${userId}`);
      }
      
      return { balanceId: removedBalanceId };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to remove balance with ID ${balanceId}: ${error.message}`);
    }
  }
}
