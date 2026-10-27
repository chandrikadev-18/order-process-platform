import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { status as GrpcStatus } from '@grpc/grpc-js';

/**
 * Global Exception Filter for API Gateway.
 * Maps gRPC status codes to appropriate HTTP status codes and ensures
 * structured JSON error responses.
 */
@Catch()
export class GrpcToHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GrpcToHttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    const correlationId =
      request?.correlationId || request?.headers?.['x-correlation-id'] || '';

    // If it is already an HttpException (e.g. ValidationPipe, Guards), preserve it
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resBody = exception.getResponse();
      const message =
        typeof resBody === 'object' && (resBody as any).message
          ? (resBody as any).message
          : exception.message;

      return response.status(status).json({
        statusCode: status,
        message,
        error: (resBody as any)?.error || exception.name,
        correlationId,
        timestamp: new Date().toISOString(),
        path: request?.url,
      });
    }

    // Determine gRPC status code
    const grpcCode = exception?.code ?? exception?.status;
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage =
      exception?.details || exception?.message || 'Internal Server Error';

    switch (grpcCode) {
      case GrpcStatus.INVALID_ARGUMENT:
        httpStatus = HttpStatus.BAD_REQUEST;
        break;
      case GrpcStatus.NOT_FOUND:
        httpStatus = HttpStatus.NOT_FOUND;
        break;
      case GrpcStatus.ALREADY_EXISTS:
        httpStatus = HttpStatus.CONFLICT;
        break;
      case GrpcStatus.PERMISSION_DENIED:
        httpStatus = HttpStatus.FORBIDDEN;
        break;
      case GrpcStatus.UNAUTHENTICATED:
        httpStatus = HttpStatus.UNAUTHORIZED;
        break;
      case GrpcStatus.FAILED_PRECONDITION:
        httpStatus = HttpStatus.BAD_REQUEST;
        break;
      case GrpcStatus.UNAVAILABLE:
        httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        errorMessage = 'Downstream microservice is temporarily unavailable';
        break;
      case GrpcStatus.DEADLINE_EXCEEDED:
        httpStatus = HttpStatus.GATEWAY_TIMEOUT;
        errorMessage = 'Downstream microservice request timed out';
        break;
      case GrpcStatus.INTERNAL:
      default:
        httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        break;
    }

    this.logger.error(
      `[EXCEPTION] ${request?.method} ${request?.url} -> HTTP ${httpStatus} (gRPC code: ${grpcCode}): ${errorMessage}`,
      exception?.stack,
    );

    response.status(httpStatus).json({
      statusCode: httpStatus,
      message: errorMessage,
      error: HttpStatus[httpStatus] || 'Error',
      correlationId,
      timestamp: new Date().toISOString(),
      path: request?.url,
    });
  }
}
