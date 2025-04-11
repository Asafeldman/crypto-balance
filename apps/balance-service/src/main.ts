import { NestFactory } from '@nestjs/core';
import { BalanceModule } from './balance.module';
import { PORT } from './constants';

async function bootstrap() {
  const app = await NestFactory.create(BalanceModule);
  await app.listen(PORT);
}
bootstrap();
