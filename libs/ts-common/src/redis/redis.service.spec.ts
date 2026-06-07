import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisService } from './redis.service';

// Minimal mock for ioredis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  decr: vi.fn(),
  exists: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
};

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedis),
}));

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RedisService({ url: 'redis://localhost:6379' });
  });

  it('get returns value', async () => {
    mockRedis.get.mockResolvedValue('hello');
    expect(await service.get('key')).toBe('hello');
    expect(mockRedis.get).toHaveBeenCalledWith('key');
  });

  it('set without ttl calls set', async () => {
    mockRedis.set.mockResolvedValue('OK');
    await service.set('key', 'value');
    expect(mockRedis.set).toHaveBeenCalledWith('key', 'value');
    expect(mockRedis.setex).not.toHaveBeenCalled();
  });

  it('set with ttl calls setex', async () => {
    mockRedis.setex.mockResolvedValue('OK');
    await service.set('key', 'value', 60);
    expect(mockRedis.setex).toHaveBeenCalledWith('key', 60, 'value');
  });

  it('del calls del', async () => {
    mockRedis.del.mockResolvedValue(1);
    await service.del('key');
    expect(mockRedis.del).toHaveBeenCalledWith('key');
  });

  it('exists returns true when key found', async () => {
    mockRedis.exists.mockResolvedValue(1);
    expect(await service.exists('key')).toBe(true);
  });

  it('exists returns false when key absent', async () => {
    mockRedis.exists.mockResolvedValue(0);
    expect(await service.exists('key')).toBe(false);
  });

  it('incr delegates to redis', async () => {
    mockRedis.incr.mockResolvedValue(5);
    expect(await service.incr('counter')).toBe(5);
  });

  it('decr delegates to redis', async () => {
    mockRedis.decr.mockResolvedValue(3);
    expect(await service.decr('counter')).toBe(3);
  });
});
