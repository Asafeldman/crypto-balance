import { Body, Controller, Delete, Get, Headers, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { Balance } from '../../../libs/shared/src/interfaces/balance.interface';
import { AddBalanceDto } from './dto/add-balance.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';

@Controller('balances')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  async getBalances(@Headers('X-User-ID') userId: string): Promise<Balance[]> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }
    return this.balanceService.getBalances(userId);
  }

  @Get(':balanceId')
  async getBalanceById(
    @Headers('X-User-ID') userId: string,
    @Param('balanceId') balanceId: string,
  ): Promise<Balance> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }
    
    const balance = await this.balanceService.getBalanceById(userId, balanceId);
    
    if (!balance) {
      throw new NotFoundException(`Balance with ID ${balanceId} not found or doesn't belong to user ${userId}`);
    }
    
    return balance;
  }

  @Post()
  async addBalance(
    @Headers('X-User-ID') userId: string,
    @Body() addBalanceDto: AddBalanceDto,
  ): Promise<Balance> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }
    
    const { asset, amount, walletId } = addBalanceDto;
    const balance = await this.balanceService.addBalance(userId, asset, amount, walletId);
    
    if (!balance) {
      throw new NotFoundException(`Failed to add balance for user ${userId}`);
    }
    
    return balance;
  }

  @Put(':balanceId')
  async updateBalance(
    @Headers('X-User-ID') userId: string,
    @Param('balanceId') balanceId: string,
    @Body() updateBalanceDto: UpdateBalanceDto,
  ): Promise<Balance> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }
    
    const balance = await this.balanceService.updateBalance(
      userId, 
      balanceId, 
      updateBalanceDto.amount,
      updateBalanceDto.walletId
    );
    
    if (!balance) {
      throw new NotFoundException(`Balance with ID ${balanceId} not found or doesn't belong to user ${userId}`);
    }
    
    return balance;
  }

  @Delete(':balanceId')
  async removeBalance(
    @Headers('X-User-ID') userId: string,
    @Param('balanceId') balanceId: string,
  ): Promise<{ balanceId: string }> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }
    
    const removedBalanceId = await this.balanceService.removeBalance(userId, balanceId);
    
    if (!removedBalanceId) {
      throw new NotFoundException(`Balance with ID ${balanceId} not found or doesn't belong to user ${userId}`);
    }
    
    return { balanceId: removedBalanceId };
  }

  // TODO: Add a method that calculates the total balance for a user in a specified currency after implementing the rate service
  // GET /balances/total?currency=USD
}
