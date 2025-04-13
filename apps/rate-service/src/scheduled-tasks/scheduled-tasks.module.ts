import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RateRefreshTask } from './rate-refresh.task';
import { RateService } from '../rate.service';
import { HttpModule } from '@nestjs/axios';
import { FileManagementService } from '../../../../libs/shared/src/file-management/file-management.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule
  ],
  providers: [
    RateRefreshTask, 
    RateService,
    FileManagementService
  ],
  exports: [RateRefreshTask]
})
export class ScheduledTasksModule {} 