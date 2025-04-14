import { NestFactory } from '@nestjs/core';
import { RateModule } from './rate.module';
import { SERVICES } from '../../../libs/shared/src/constants';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from '../../../libs/shared/src/error-handling/filters/http-exception.filter';
import { ErrorHandlingService } from '../../../libs/shared/src/error-handling/error-handling.service';

async function bootstrap() {
  const app = await NestFactory.create(RateModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  const errorHandlingService = new ErrorHandlingService();
  app.useGlobalFilters(new HttpExceptionFilter(errorHandlingService));
  
  await app.listen(SERVICES.RATE.PORT);
  console.log(`Rate service is running on: ${SERVICES.RATE.URL}`);
}
bootstrap(); 