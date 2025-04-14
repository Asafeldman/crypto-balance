import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../../../libs/shared/src/interfaces/user.interface';

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
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'A user with this email already exists') {
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
} 