import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ApiError, ErrorBody, ErrorCode } from './api-error';

/**
 * Renders every HTTP error as {"error":{"code","message"}}.
 * Unknown errors become a generic 500 so stack traces and DB details never reach the client.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return;
    const res = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toErrorBody(exception);
    res.status(status).json(body);
  }

  private toErrorBody(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof ApiError) {
      return { status: exception.getStatus(), body: exception.getResponse() as ErrorBody };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === HttpStatus.BAD_REQUEST) {
        // Body-parser failures (malformed JSON) arrive here as a plain 400.
        return error(status, ErrorCode.VALIDATION_ERROR, 'Request body must be valid JSON.');
      }
      if (status === HttpStatus.NOT_FOUND) {
        return error(status, ErrorCode.NOT_FOUND, 'Route not found.');
      }
      if (status < 500) {
        return error(status, HttpStatus[status] ?? 'HTTP_ERROR', exception.message || 'Request failed.');
      }
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return error(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}

function error(status: number, code: string, message: string) {
  return { status, body: { error: { code, message } } };
}
