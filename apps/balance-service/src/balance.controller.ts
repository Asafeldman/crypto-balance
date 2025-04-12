import { Body, Controller, Delete, Get, Headers, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { Balance } from '../../../libs/shared/src/interfaces/balance.interface';
import { AddBalanceDto } from './dto/add-balance.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { RemoveBalanceDto } from './dto/remove-balance.dto';

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

  @Post()
  async addBalance(
    @Headers('X-User-ID') userId: string,
    @Body() addBalanceDto: AddBalanceDto
  ): Promise<Balance> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }

    const { asset, amount, walletId } = addBalanceDto;
    const balance = await this.balanceService.addBalance(userId, asset, amount, walletId);
    
    if (!balance) {
      throw new NotFoundException(`User with ID ${userId} not found or has no wallets`);
    }
    
    return balance;
  }

  @Get(':balanceId')
  async getBalance(
    @Headers('X-User-ID') userId: string,
    @Param('balanceId') balanceId: string
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

  @Put()
  async updateBalance(
    @Headers('X-User-ID') userId: string,
    @Body() updateBalanceDto: UpdateBalanceDto
  ): Promise<Balance> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }

    const { balanceId, amount } = updateBalanceDto;
    const balance = await this.balanceService.updateBalance(userId, balanceId, amount);
    
    if (!balance) {
      throw new NotFoundException(`Balance with ID ${balanceId} not found or doesn't belong to user ${userId}`);
    }
    
    return balance;
  }

  @Delete()
  async removeBalance(
    @Headers('X-User-ID') userId: string,
    @Body() removeBalanceDto: RemoveBalanceDto
  ): Promise<{ balanceId: string }> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }

    const { balanceId } = removeBalanceDto;
    const removedBalanceId = await this.balanceService.removeBalance(userId, balanceId);
    
    if (!removedBalanceId) {
      throw new NotFoundException(`Balance with ID ${balanceId} not found or doesn't belong to user ${userId}`);
    }
    
    return { balanceId: removedBalanceId };
  }

  // TODO: Refactor this endpoint - User creation should move to user-service, balance-service should have an endpoint for wallet creation only
  @Post('users')
  // TODO: To be removed after user-service implementation
  async createUser(@Body() createUserDto: CreateUserDto): Promise<{ userId: string; walletId: string }> {
    // TODO: To be removed after user-service implementation
    const { userId, walletId } = this.balanceService.createUserWithWallet(
      createUserDto.userName,
      createUserDto.email,
      createUserDto.walletName,
    );
    return { userId, walletId };
  }

  // TODO: Add a method that calculates the total balance for a user in a specified currency after implementing the rate service
  // GET /balances/:userId/total?currency=USD
}
