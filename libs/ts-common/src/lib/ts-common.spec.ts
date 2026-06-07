import { describe, it, expect } from 'vitest';

describe('ts-common', () => {
  it('package exports are defined', async () => {
    const mod = await import('../index');
    expect(mod).toBeDefined();
  });
});
