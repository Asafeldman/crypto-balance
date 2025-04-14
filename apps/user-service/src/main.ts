import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { UserModule } from './user.module';
import { SERVICES } from '../../../libs/shared/src/constants';
import { HttpExceptionFilter } from '../../../libs/shared/src/error-handling/filters/http-exception.filter';
import { ErrorHandlingService } from '../../../libs/shared/src/error-handling/error-handling.service';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(UserModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, 
    forbidNonWhitelisted: true, 
    transform: true, 
  }));
  
  const errorHandlingService = new ErrorHandlingService();
  app.useGlobalFilters(new HttpExceptionFilter(errorHandlingService));
  
  app.enableCors();
  await app.listen(SERVICES.USER.PORT);
  console.log(`User service is running on: ${SERVICES.USER.URL}`);
}

bootstrap(); 