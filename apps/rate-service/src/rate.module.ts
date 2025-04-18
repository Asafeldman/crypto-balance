import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RateController } from './rate.controller';
import { RateService } from './rate.service';
import { FileManagementModule } from '../../../libs/shared/src/file-management/file-management.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { ErrorHandlingModule } from '../../../libs/shared/src/error-handling/error-handling.module';

@Module({
  imports: [HttpModule, FileManagementModule, ScheduledTasksModule, ErrorHandlingModule],
  controllers: [RateController],
  providers: [RateService],
})
export class RateModule {} 