import { IsNotEmpty, IsObject } from 'class-validator';
 
export class RebalanceDto {
  @IsNotEmpty()
  @IsObject()
  targetPercentages: Record<string, number>;
} 