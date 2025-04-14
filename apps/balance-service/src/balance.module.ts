import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { FileManagementModule } from '../../../libs/shared/src/file-management/file-management.module';
import { ErrorHandlingModule } from '../../../libs/shared/src/error-handling/error-handling.module';

@Module({
  imports: [FileManagementModule, HttpModule, ErrorHandlingModule],
  controllers: [BalanceController],
  providers: [BalanceService],
})
export class BalanceModule {}
