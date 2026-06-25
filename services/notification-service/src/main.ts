import '@org/ts-common/tracing';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter } from '@org/ts-common';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', { exclude: ['metrics', 'health'] });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const port = process.env['PORT'] ?? 8087;
  await app.listen(port);
  Logger.log(`Notification service running on: http://localhost:${port}/api`);
}

bootstrap();
