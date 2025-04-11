import { Injectable } from '@nestjs/common';

@Injectable()
export class BalanceService {
  getHello(): string {
    return 'Hello from Balance Service!';
  }
}
