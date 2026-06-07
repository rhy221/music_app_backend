import { DynamicModule, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface RedisModuleOptions {
  url: string;
  keyPrefix?: string;
}

export const REDIS_MODULE_OPTIONS = 'REDIS_MODULE_OPTIONS';

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
