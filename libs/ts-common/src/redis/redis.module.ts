import { DynamicModule, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { REDIS_MODULE_OPTIONS, RedisModuleOptions } from './redis.constants';

export type { RedisModuleOptions };

/**
 * NestJS dynamic module wrapping ioredis.
 *
 * @example
 * RedisModule.forRoot({ url: process.env.REDIS_URL })
 */
@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        { provide: REDIS_MODULE_OPTIONS, useValue: options },
        RedisService,
      ],
      exports: [RedisService],
      global: true,
    };
  }
}
