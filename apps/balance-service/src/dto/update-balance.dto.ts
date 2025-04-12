import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class UpdateBalanceDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  balanceId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;
} 