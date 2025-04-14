import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class AddBalanceDto {
  @IsString()
  @IsNotEmpty()
  asset: string = '';

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number = 0;
} 