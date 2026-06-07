import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthUser } from '../auth/auth.interfaces';

/**
 * Logs each HTTP request with method, URL, userId, response status, and duration.
 * Request bodies are intentionally NOT logged to avoid leaking sensitive data.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const user: AuthUser | undefined = req.user;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode: number = context
            .switchToHttp()
            .getResponse().statusCode;
          this.logger.log(
            JSON.stringify({
              method,
              url,
              statusCode,
              userId: user?.userId,
              durationMs: Date.now() - start,
            }),
          );
        },
        error: (err: Error) => {
          this.logger.error(
            JSON.stringify({
              method,
              url,
              userId: user?.userId,
              durationMs: Date.now() - start,
              error: err.message,
            }),
          );
        },
      }),
    );
  }
}
