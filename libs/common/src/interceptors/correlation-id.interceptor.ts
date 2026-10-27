import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';

/**
 * Correlation ID Interceptor.
 * Ensures every incoming HTTP or RPC request has a valid correlationId
 * for end-to-end distributed tracing across microservices.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextType = context.getType<'http' | 'rpc'>();

    if (contextType === 'http') {
      const http = context.switchToHttp();
      const req = http.getRequest();
      const res = http.getResponse();

      let correlationId = req.headers['x-correlation-id'];
      if (!correlationId) {
        correlationId = randomUUID();
        req.headers['x-correlation-id'] = correlationId;
      }

      req.correlationId = correlationId;
      if (res && res.setHeader) {
        res.setHeader('x-correlation-id', correlationId);
      }
    } else if (contextType === 'rpc') {
      const rpcContext = context.switchToRpc().getContext();
      let correlationId = randomUUID();

      if (rpcContext && typeof rpcContext.get === 'function') {
        const metadataId = rpcContext.get('x-correlation-id');
        if (metadataId && metadataId.length > 0) {
          correlationId = metadataId[0];
        }
      }
      const data = context.switchToRpc().getData();
      if (data && typeof data === 'object') {
        data.correlationId = correlationId;
      }
    }

    return next.handle();
  }
}
