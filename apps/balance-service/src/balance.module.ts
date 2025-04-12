import { Module } from '@nestjs/common';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { FileManagementModule } from '../../../libs/shared/src/file-management/file-management.module';

@Module({
  imports: [FileManagementModule],
  controllers: [BalanceController],
  providers: [BalanceService],
})
export class BalanceModule {}
