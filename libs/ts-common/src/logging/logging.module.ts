import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';
import { LogstashTransport } from './logstash.transport';

/**
 * Registers LoggingInterceptor as a global interceptor for all HTTP requests.
 * Set LOGSTASH_HOST=hostname:port to enable TCP log shipping to Logstash.
 */
@Module({
  providers: [
    LogstashTransport,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [LogstashTransport],
})
export class LoggingModule {}
