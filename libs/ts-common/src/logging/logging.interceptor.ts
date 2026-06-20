import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthUser } from '../auth/auth.interfaces';
import { LogstashTransport } from './logstash.transport';

/**
 * Logs each HTTP request with method, URL, userId, response status, and duration.
 * Request bodies are intentionally NOT logged to avoid leaking sensitive data.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(
    @Optional() private readonly logstash?: LogstashTransport,
  ) {}

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
          const logData = {
            method,
            url,
            statusCode,
            userId: user?.userId,
            durationMs: Date.now() - start,
          };
          this.logger.log(JSON.stringify(logData));
          this.logstash?.send({ level: 'INFO', ...logData });
        },
        error: (err: Error) => {
          const logData = {
            method,
            url,
            userId: user?.userId,
            durationMs: Date.now() - start,
            error: err.message,
          };
          this.logger.error(JSON.stringify(logData));
          this.logstash?.send({ level: 'ERROR', ...logData });
        },
      }),
    );
  }
}
