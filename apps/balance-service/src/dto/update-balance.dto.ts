import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateBalanceDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number = 0;
} 