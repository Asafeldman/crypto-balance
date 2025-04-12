import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { FileManagementModule } from '../../../libs/shared/src/file-management/file-management.module';

@Module({
  imports: [FileManagementModule, HttpModule],
  controllers: [BalanceController],
  providers: [BalanceService],
})
export class BalanceModule {}
