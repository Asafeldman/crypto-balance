import { IsNotEmpty, IsNumber, IsString, IsUUID, Min, IsOptional } from 'class-validator';

export class AddBalanceDto {
  @IsString()
  @IsNotEmpty()
  asset: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;
  
  @IsUUID()
  @IsNotEmpty()
  walletId: string;
} 