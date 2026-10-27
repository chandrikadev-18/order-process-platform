import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Global Logging Interceptor.
 * Logs incoming request method, route, correlation ID, and execution duration.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const type = context.getType<'http' | 'rpc'>();

    let identifier = '';
    let correlationId = '';

    if (type === 'http') {
      const req = context.switchToHttp().getRequest();
      identifier = `${req.method} ${req.url}`;
      correlationId =
        req.correlationId || req.headers?.['x-correlation-id'] || '';
    } else if (type === 'rpc') {
      const handlerName = context.getHandler().name;
      const className = context.getClass().name;
      identifier = `RPC ${className}.${handlerName}`;
      const data = context.switchToRpc().getData();
      correlationId = data?.correlationId || '';
    }

    this.logger.log(
      `--> [START] ${identifier} (correlationId: ${correlationId})`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(
            `<-- [SUCCESS] ${identifier} took ${duration}ms (correlationId: ${correlationId})`,
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.error(
            `<-- [ERROR] ${identifier} failed after ${duration}ms (correlationId: ${correlationId}): ${err.message}`,
          );
        },
      }),
    );
  }
}
