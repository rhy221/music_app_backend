import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Records HTTP request counts and latency for every routed request.
 * Uses the route path (not the full URL) to avoid label cardinality explosion.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const path: string = req.route?.path ?? req.url;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = String(
            context.switchToHttp().getResponse().statusCode,
          );
          const duration = (Date.now() - start) / 1000;
          this.metricsService.httpRequestsTotal.inc({ method, path, statusCode });
          this.metricsService.httpRequestDuration.observe({ method, path }, duration);
        },
        error: () => {
          const duration = (Date.now() - start) / 1000;
          this.metricsService.httpRequestsTotal.inc({ method, path, statusCode: '500' });
          this.metricsService.httpRequestDuration.observe({ method, path }, duration);
        },
      }),
    );
  }
}
