import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const respObj = response as Record<string, unknown>;
        message = (respObj.message as string | string[]) || exception.message;
        details = respObj.errors;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`${req.method} ${req.url} -> ${exception.message}`, exception.stack);
    }

    res.status(status).json({
      statusCode: status,
      message,
      ...(details ? { errors: details } : {}),
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
