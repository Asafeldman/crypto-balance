import { NestFactory } from '@nestjs/core';
import { BalanceModule } from './balance.module';
import { SERVICES } from '../../../libs/shared/src/constants';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(BalanceModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  await app.listen(SERVICES.BALANCE.PORT);
  console.log(`Balance service is running on: ${SERVICES.BALANCE.URL}`);
}
bootstrap();
