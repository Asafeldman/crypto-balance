import { NestFactory } from '@nestjs/core';
import { RateModule } from './rate.module';
import { PORT } from './constants';

async function bootstrap() {
  const app = await NestFactory.create(RateModule);
  await app.listen(PORT);
}
bootstrap(); 