import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from './error-response.interface';

/**
 * Global exception filter that normalises all errors into a consistent JSON shape.
 * HttpExceptions are mapped to their own status code; unknown errors return 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : (body as Record<string, unknown>).message?.toString() ?? exception.message;
    } else {
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    }

    const body: ErrorResponse = {
      status,
      error: HttpStatus[status] ?? 'Error',
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    res.status(status).json(body);
  }
}
