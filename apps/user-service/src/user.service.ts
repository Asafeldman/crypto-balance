import { Injectable } from '@nestjs/common';
import { FileManagementService } from '../../../libs/shared/src/file-management/file-management.service';
import { randomUUID } from 'crypto';
import { User, UsersFile } from './interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { Wallet, WalletsFile } from './interfaces/wallet.interface';

@Injectable()
export class UserService {
  private readonly usersFilePath: string;
  private readonly walletsFilePath: string;

  constructor(private readonly fileManagementService: FileManagementService) {
    this.usersFilePath = this.fileManagementService.resolveDataPath('users.json');
    this.walletsFilePath = this.fileManagementService.resolveDataPath('wallets.json');
    this.fileManagementService.ensureDataFilesExist([
      { filename: 'users.json', emptyContent: '{"users":[]}' },
      { filename: 'wallets.json', emptyContent: '{"wallets":[]}' }
    ]);
  }

  getAllUsers(): User[] {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      return usersData.users;
    } catch (error) {
      console.error(`Error retrieving users: ${error.message}`);
      return [];
    }
  }

  getUserById(userId: string): User | null {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      const user = usersData.users.find(u => u.userId === userId);
      
      if (!user) {
        return null;
      }
      
      return user;
    } catch (error) {
      console.error(`Error retrieving user ${userId}: ${error.message}`);
      return null;
    }
  }

  createUser(createUserDto: CreateUserDto): User {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      
      const existingUserWithEmail = usersData.users.find(
        u => u.email.toLowerCase() === createUserDto.email.toLowerCase()
      );
      
      if (existingUserWithEmail) {
        throw new Error('A user with this email already exists');
      }
      
      const userId = randomUUID();
      const now = new Date().toISOString();
      
      const newUser: User = {
        userId,
        walletIds: [],
        userName: createUserDto.userName,
        email: createUserDto.email,
        createdAt: now,
        updatedAt: now
      };
      
      usersData.users.push(newUser);
      this.fileManagementService.writeJsonFile(this.usersFilePath, usersData);
      
      return newUser;
    } catch (error) {
      console.error(`Error creating user: ${error.message}`);
      throw new Error('Could not create user');
    }
  }

  updateUser(userId: string, updateUserDto: UpdateUserDto): User | null {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      const userIndex = usersData.users.findIndex(u => u.userId === userId);
      
      if (userIndex === -1) {
        return null;
      }
      
      const user = usersData.users[userIndex];
      const updatedUser = {
        ...user,
        ...updateUserDto,
        updatedAt: new Date().toISOString()
      };
      
      usersData.users[userIndex] = updatedUser;
      this.fileManagementService.writeJsonFile(this.usersFilePath, usersData);
      
      return updatedUser;
    } catch (error) {
      console.error(`Error updating user ${userId}: ${error.message}`);
      return null;
    }
  }

  removeUser(userId: string): string | null {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      const walletsData = this.fileManagementService.readJsonFile<WalletsFile>(this.walletsFilePath);
      
      const userIndex = usersData.users.findIndex(u => u.userId === userId);
      
      if (userIndex === -1) {
        return null;
      }
      
      const updatedWallets = walletsData.wallets.filter(w => w.userId !== userId);
      if (updatedWallets.length !== walletsData.wallets.length) {
        walletsData.wallets = updatedWallets;
        this.fileManagementService.writeJsonFile(this.walletsFilePath, walletsData);
      }
      
      usersData.users.splice(userIndex, 1);
      this.fileManagementService.writeJsonFile(this.usersFilePath, usersData);
      
      return userId;
    } catch (error) {
      console.error(`Error removing user ${userId}: ${error.message}`);
      return null;
    }
  }

  getUserWallets(userId: string): Wallet[] {
    try {
      const user = this.getUserById(userId);
      const walletsData = this.fileManagementService.readJsonFile<WalletsFile>(this.walletsFilePath);
      
      if (!user) {
        return [];
      }
      
      return walletsData.wallets.filter(wallet => user.walletIds.includes(wallet.walletId));
    } catch (error) {
      console.error(`Error retrieving wallets for user ${userId}: ${error.message}`);
      return [];
    }
  }

  removeWalletFromUser(userId: string, walletId: string): User | null {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      const walletsData = this.fileManagementService.readJsonFile<WalletsFile>(this.walletsFilePath);
      
      const userIndex = usersData.users.findIndex(u => u.userId === userId);
      
      if (userIndex === -1) {
        return null;
      }
      
      const user = usersData.users[userIndex];
      const walletIndex = user.walletIds.indexOf(walletId);
      
      if (walletIndex === -1) {
        return user;
      }
      
      user.walletIds.splice(walletIndex, 1);
      user.updatedAt = new Date().toISOString();
      
      const walletDataIndex = walletsData.wallets.findIndex(w => w.walletId === walletId);
      if (walletDataIndex !== -1) {
        walletsData.wallets.splice(walletDataIndex, 1);
        this.fileManagementService.writeJsonFile(this.walletsFilePath, walletsData);
      }
      
      usersData.users[userIndex] = user;
      this.fileManagementService.writeJsonFile(this.usersFilePath, usersData);
      
      return user;
    } catch (error) {
      console.error(`Error removing wallet from user ${userId}: ${error.message}`);
      return null;
    }
  }

  createWalletForUser(userId: string, createWalletDto: CreateWalletDto): { user: User | null; walletId: string | null } {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      const walletsData = this.fileManagementService.readJsonFile<WalletsFile>(this.walletsFilePath);
      
      const userIndex = usersData.users.findIndex(u => u.userId === userId);
      
      if (userIndex === -1) {
        return { user: null, walletId: null };
      }
      
      const user = usersData.users[userIndex];
      const walletId = randomUUID();
      const now = new Date().toISOString();
      
      const newWallet: Wallet = {
        walletId,
        userId,
        name: createWalletDto.walletName,
        createdAt: now
      };
      
      walletsData.wallets.push(newWallet);
      this.fileManagementService.writeJsonFile(this.walletsFilePath, walletsData);
      
      user.walletIds.push(walletId);
      user.updatedAt = now;
      
      usersData.users[userIndex] = user;
      this.fileManagementService.writeJsonFile(this.usersFilePath, usersData);
      
      return { user, walletId };
    } catch (error) {
      console.error(`Error creating wallet for user ${userId}: ${error.message}`);
      return { user: null, walletId: null };
    }
  }

  getWalletById(walletId: string): Wallet | null {
    try {
      const walletsData = this.fileManagementService.readJsonFile<WalletsFile>(this.walletsFilePath);
      return walletsData.wallets.find(w => w.walletId === walletId) || null;
    } catch (error) {
      console.error(`Error retrieving wallet ${walletId}: ${error.message}`);
      return null;
    }
  }
} 