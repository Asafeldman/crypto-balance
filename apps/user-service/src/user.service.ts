import { Injectable, NotFoundException } from '@nestjs/common';
import { FileManagementService } from '../../../libs/shared/src/file-management/file-management.service';
import { randomUUID } from 'crypto';
import { User, UsersFile } from '../../../libs/shared/src/interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private readonly usersFilePath: string;

  constructor(private readonly fileManagementService: FileManagementService) {
    this.usersFilePath = this.fileManagementService.resolveDataPath('users.json');
    this.fileManagementService.ensureDataFilesExist([
      { filename: 'users.json', emptyContent: '{"users":[]}' }
    ]);
  }

  getAllUsers(): User[] {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      return usersData.users;
    } catch (error: unknown) {
      console.error(`Error retrieving users: ${error instanceof Error ? error.message : String(error)}`);
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
    } catch (error: unknown) {
      console.error(`Error retrieving user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
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
        userName: createUserDto.userName,
        email: createUserDto.email,
        createdAt: now,
        updatedAt: now
      };
      
      usersData.users.push(newUser);
      this.fileManagementService.writeJsonFile(this.usersFilePath, usersData);
      
      return newUser;
    } catch (error: unknown) {
      console.error(`Error creating user: ${error instanceof Error ? error.message : String(error)}`);
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
    } catch (error: unknown) {
      console.error(`Error updating user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  removeUser(userId: string): string | null {
    try {
      const usersData = this.fileManagementService.readJsonFile<UsersFile>(this.usersFilePath);
      
      const userIndex = usersData.users.findIndex(u => u.userId === userId);
      
      if (userIndex === -1) {
        return null;
      }
      
      const balancesFilePath = this.fileManagementService.resolveDataPath('balances.json');
      try {
        const balancesData = this.fileManagementService.readJsonFile<{ balances: any[] }>(balancesFilePath);
        if (balancesData && balancesData.balances) {
          balancesData.balances = balancesData.balances.filter(balance => balance.userId !== userId);
          this.fileManagementService.writeJsonFile(balancesFilePath, balancesData);
        }
      } catch (error: unknown) {
        console.error(`Error cleaning up balances for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      usersData.users.splice(userIndex, 1);
      this.fileManagementService.writeJsonFile(this.usersFilePath, usersData);
      
      return userId;
    } catch (error: unknown) {
      console.error(`Error removing user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
} 