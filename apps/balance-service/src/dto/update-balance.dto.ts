import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class UpdateBalanceDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;
  
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  walletId: string;
} 