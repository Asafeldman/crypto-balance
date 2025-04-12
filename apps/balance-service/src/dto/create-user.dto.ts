import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// TODO: Split this DTO - User fields should move to user-service, wallet fields should remain in balance-service
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  walletName: string;
} 