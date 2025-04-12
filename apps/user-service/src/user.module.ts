import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FileManagementModule } from '../../../libs/shared/src/file-management/file-management.module';

@Module({
  imports: [FileManagementModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {} 