import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';

/**
 * Registers LoggingInterceptor as a global interceptor for all HTTP requests.
 */
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class LoggingModule {}
