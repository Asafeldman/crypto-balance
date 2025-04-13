import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { UserModule } from './user.module';
import { SERVICES } from '../../../libs/shared/src/constants';

async function bootstrap() {
  const app = await NestFactory.create(UserModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, 
    forbidNonWhitelisted: true, 
    transform: true, 
  }));
  
  app.enableCors();
  await app.listen(SERVICES.USER.PORT);
  console.log(`User service is running on: ${SERVICES.USER.URL}`);
}

bootstrap(); 