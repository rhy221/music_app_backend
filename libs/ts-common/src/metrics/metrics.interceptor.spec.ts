import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

function makeCtx(method = 'GET', path = '/test', statusCode = 200): ExecutionContext {
  const req = { method, route: { path }, url: path };
  const res = { statusCode };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
}

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = {
      httpRequestsTotal: { inc: vi.fn() },
      httpRequestDuration: { observe: vi.fn() },
    } as unknown as MetricsService;

    interceptor = new MetricsInterceptor(metricsService);
  });

  it('records metrics on successful response', (done) => {
    const ctx = makeCtx('GET', '/tracks', 200);
    const next = { handle: () => of({ data: 'ok' }) };

    interceptor.intercept(ctx, next as never).subscribe({
      complete: () => {
        expect(metricsService.httpRequestsTotal.inc).toHaveBeenCalledWith({
          method: 'GET',
          path: '/tracks',
          statusCode: '200',
        });
        expect(metricsService.httpRequestDuration.observe).toHaveBeenCalled();
        done();
      },
    });
  });

  it('records metrics with status 500 on error', (done) => {
    const ctx = makeCtx('POST', '/upload', 500);
    const next = { handle: () => throwError(() => new Error('fail')) };

    interceptor.intercept(ctx, next as never).subscribe({
      error: () => {
        expect(metricsService.httpRequestsTotal.inc).toHaveBeenCalledWith({
          method: 'POST',
          path: '/upload',
          statusCode: '500',
        });
        done();
      },
    });
  });
});
