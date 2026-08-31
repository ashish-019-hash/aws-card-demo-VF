import {
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '../logging/correlation-id.middleware';

interface Violation {
  field: string;
  message: string;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const details = exception instanceof HttpException ? exception.getResponse() : undefined;
    const detail = isProblemPayload(details) ? details : undefined;
    const message =
      typeof detail?.message === 'string'
        ? detail.message
        : status === 500
          ? 'An unexpected error occurred.'
          : 'Request failed.';
    const messages: unknown[] = Array.isArray(detail?.message) ? detail.message : [];
    const violations: Violation[] = messages.map((entry: unknown) => ({
      field: '',
      message: String(entry),
    }));

    response
      .status(status)
      .type('application/problem+json')
      .send({
        type: `https://carddemo.example/problems/${status}`,
        title: HttpStatus[status] ?? 'Error',
        status,
        detail: message,
        code: typeof detail?.code === 'string' ? detail.code : defaultProblemCode(status),
        correlationId: request.header(CORRELATION_ID_HEADER),
        ...(violations.length > 0 ? { violations } : {}),
      });
  }
}

function defaultProblemCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'AUTHENTICATION_FAILED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'INTERNAL_ERROR';
  }
}

function isProblemPayload(
  value: unknown,
): value is { message?: string | unknown[]; code?: string } {
  return typeof value === 'object' && value !== null;
}
