import { NestFactory } from '@nestjs/core';
import { RateModule } from './rate.module';
import { SERVICES } from '../../../libs/shared/src/constants';

async function bootstrap() {
  const app = await NestFactory.create(RateModule);
  await app.listen(SERVICES.RATE.PORT);
  console.log(`Rate service is running on: ${SERVICES.RATE.URL}`);
}
bootstrap(); 