import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RemoveBalanceDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  balanceId: string;
}