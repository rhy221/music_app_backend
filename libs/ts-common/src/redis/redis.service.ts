import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_MODULE_OPTIONS, RedisModuleOptions } from './redis.constants';

/**
 * Wraps ioredis with typed helpers for common cache operations.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(@Inject(REDIS_MODULE_OPTIONS) options: RedisModuleOptions) {
    this.client = new Redis(options.url, {
      keyPrefix: options.keyPrefix,
      lazyConnect: false,
    });
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  /** Returns the value for a key, or null if absent. */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** Sets a key. Optionally expires after ttlSeconds. */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /** Deletes a key. */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** Increments the integer value of a key by 1. */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /** Decrements the integer value of a key by 1. */
  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  /** Returns true if the key exists. */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /** Exposes the raw ioredis client for advanced operations (pub/sub, scripting). */
  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
