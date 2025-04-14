import { NestFactory } from '@nestjs/core';
import { BalanceModule } from './balance.module';
import { SERVICES } from '../../../libs/shared/src/constants';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from '../../../libs/shared/src/error-handling/filters/http-exception.filter';
import { ErrorHandlingService } from '../../../libs/shared/src/error-handling/error-handling.service';

async function bootstrap() {
  const app = await NestFactory.create(BalanceModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  const errorHandlingService = new ErrorHandlingService();
  app.useGlobalFilters(new HttpExceptionFilter(errorHandlingService));
  
  await app.listen(SERVICES.BALANCE.PORT);
  console.log(`Balance service is running on: ${SERVICES.BALANCE.URL}`);
}
bootstrap();
