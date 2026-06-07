import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthGuard } from './auth.guard';

function makeCtx(headers: Record<string, string>, isPublic = false): ExecutionContext {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(isPublic) } as unknown as Reflector;
  const req = { headers, user: undefined as unknown };
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => req }),
    _reflector: reflector,
    _req: req,
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector;
    guard = new AuthGuard(reflector);
  });

  it('allows request with X-User-Id header', () => {
    const req = { headers: { 'x-user-id': 'user-1', 'x-user-role': 'USER' }, user: undefined };
    const ctx = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
    expect((req as { user: unknown }).user).toEqual({ userId: 'user-1', role: 'USER' });
  });

  it('throws UnauthorizedException when X-User-Id is missing', () => {
    const req = { headers: {}, user: undefined };
    const ctx = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('allows public endpoints without headers', () => {
    reflector.getAllAndOverride = vi.fn().mockReturnValue(true);
    const req = { headers: {}, user: undefined };
    const ctx = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
