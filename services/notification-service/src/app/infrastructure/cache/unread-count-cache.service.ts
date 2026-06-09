import { Injectable } from '@nestjs/common';
import { RedisService } from '@org/ts-common';

const CACHE_TTL_SECONDS = 300;

@Injectable()
export class UnreadCountCacheService {
  constructor(private readonly redis: RedisService) {}

  private key(userId: string): string {
    return `unread:${userId}`;
  }

  async get(userId: string): Promise<number | null> {
    const val = await this.redis.get(this.key(userId));
    return val !== null ? parseInt(val, 10) : null;
  }

  async set(userId: string, count: number): Promise<void> {
    await this.redis.set(this.key(userId), String(count), CACHE_TTL_SECONDS);
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.del(this.key(userId));
  }
}
