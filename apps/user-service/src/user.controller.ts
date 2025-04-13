import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { User } from '../../../libs/shared/src/interfaces/user.interface';
import { Wallet } from '../../../libs/shared/src/interfaces/wallet.interface';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getAllUsers(): User[] {
    return this.userService.getAllUsers();
  }

  @Get(':userId')
  getUserById(@Param('userId') userId: string): User {
    const user = this.userService.getUserById(userId);
    
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return user;
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto): User {
    try {
      return this.userService.createUser(createUserDto);
    } catch (error) {
      if (error.message === 'A user with this email already exists') {
        throw new ConflictException(error.message);
      }
      throw new InternalServerErrorException('Could not create user');
    }
  }

  @Put(':userId')
  updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): User {
    const updatedUser = this.userService.updateUser(userId, updateUserDto);
    
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return updatedUser;
  }

  @Delete(':userId')
  removeUser(@Param('userId') userId: string): { userId: string } {
    const removedUserId = this.userService.removeUser(userId);
    
    if (!removedUserId) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return { userId: removedUserId };
  }

  @Get(':userId/wallets')
  getUserWallets(@Param('userId') userId: string): Wallet[] {
    const wallets = this.userService.getUserWallets(userId);
    
    if (!this.userService.getUserById(userId)) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return wallets;
  }

  @Get('wallets/:walletId')
  getWalletById(@Param('walletId') walletId: string): Wallet {
    const wallet = this.userService.getWalletById(walletId);
    
    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }
    
    return wallet;
  }

  @Post(':userId/wallets')
  createWalletForUser(
    @Param('userId') userId: string,
    @Body() createWalletDto: CreateWalletDto
  ): { userId: string; walletId: string } {
    const result = this.userService.createWalletForUser(userId, createWalletDto);
    
    if (!result.user || !result.walletId) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return { userId, walletId: result.walletId };
  }

  @Delete(':userId/wallets/:walletId')
  removeWalletFromUser(
    @Param('userId') userId: string,
    @Param('walletId') walletId: string,
  ): User {
    const updatedUser = this.userService.removeWalletFromUser(userId, walletId);
    
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return updatedUser;
  }
} 