// app/server/middleware/logger.ts
import { Logger } from '@/modules/logger';
import type { Variables } from '@/server/types';
import { trace } from '@opentelemetry/api';
import { createMiddleware } from 'hono/factory';

export function loggerMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const start = Date.now();
    const requestId = c.get('requestId') ?? crypto.randomUUID();

    // Get OTEL trace context
    const otelSpan = trace.getActiveSpan();
    const otelContext = otelSpan?.spanContext();

    // Create request-scoped logger with OTEL correlation
    const reqLogger = new Logger({
      requestId,
      traceId: otelContext?.traceId,
      spanId: otelContext?.spanId,
      path: c.req.path,
      method: c.req.method,
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP'),
    });

    c.set('logger', reqLogger);

    await next();

    const duration = Date.now() - start;

    reqLogger.request({
      status: c.res.status,
      duration,
    });
  });
}
