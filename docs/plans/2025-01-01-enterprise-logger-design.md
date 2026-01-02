# Enterprise Logger Design

## Overview

A centralized, context-aware logging system for cloud-portal with full observability integration (Grafana Loki, Sentry, Jaeger tracing).

## Requirements

1. **Full request correlation** - Every log entry traceable via requestId, traceId, spanId
2. **Multi-destination output** - Terminal (dev), Grafana Loki (prod), Sentry (errors)
3. **OpenTelemetry compatible** - traceId/spanId for Jaeger integration
4. **Environment-configurable** - Format and level via ENV variables
5. **Security** - Token redaction in production logs
6. **Developer experience** - Curl commands for easy API replay

## Architecture

### File Structure

```
app/modules/logger/
├── index.ts              # Exports: logger, Logger, createRequestLogger, etc.
├── logger.ts             # Logger class with child/context pattern
├── logger.config.ts      # Environment-based configuration
├── logger.types.ts       # TypeScript interfaces
├── formatters/
│   ├── pretty.ts         # Colored terminal output (dev)
│   ├── json.ts           # Structured JSON output (prod)
│   └── index.ts          # Format selector based on config
├── integrations/
│   ├── sentry.ts         # Breadcrumbs, tags, context injection
│   └── curl.ts           # Curl command generator with redaction
└── utils.ts              # Helper factories (createRequestLogger, etc.)
```

### Configuration

Environment variables:

| Variable            | Values                   | Default (prod) | Default (dev) |
| ------------------- | ------------------------ | -------------- | ------------- |
| `LOG_LEVEL`         | debug, info, warn, error | info           | debug         |
| `LOG_FORMAT`        | json, pretty, compact    | json           | pretty        |
| `LOG_CURL`          | true, false              | false          | true          |
| `LOG_REDACT_TOKENS` | true, false              | true           | false         |

## Logger Class API

```typescript
class Logger {
  private context: LogContext;

  constructor(context?: LogContext);

  // Create child logger with additional context
  child(context: LogContext): Logger;

  // Standard log levels
  debug(message: string, data?: LogData): void;
  info(message: string, data?: LogData): void;
  warn(message: string, data?: LogData): void;
  error(message: string, error?: Error, data?: LogData): void;

  // Specialized log methods
  request(data: RequestLogData): void; // Incoming HTTP request
  api(data: ApiLogData): void; // Outgoing API call
  apiError(data: ApiErrorData): void; // Failed API call
  service(name: string, method: string, data: ServiceLogData): void;
}
```

### Context Interface

```typescript
interface LogContext {
  // Correlation IDs (OpenTelemetry compatible)
  requestId?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;

  // User context
  userId?: string;
  sessionId?: string;
  organizationId?: string;

  // Request context
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;

  // Extensible
  [key: string]: unknown;
}
```

## Output Formats

### Pretty Format (Development)

```
[INFO ] [a1b2c3d4] GET /account/organizations 200 143ms
[INFO ] → GET /apis/resourcemanager/v1alpha1/organizations 200 89ms
         curl: curl -X GET -H 'Authorization:Bearer eyJhbG...' 'https://api.datum.net/...'
[INFO ] [OrganizationService.list] 92ms
[WARN ] Rate limit approaching for org-123
[ERROR] → GET /apis/iam/v1alpha1/users 500 23ms
         error: "Internal server error"
         curl: curl -X GET -H 'Authorization:Bearer eyJhbG...' 'https://api.datum.net/...'
```

Color scheme:

- `DEBUG` → cyan
- `INFO` → green
- `WARN` → yellow
- `ERROR` → red
- Request ID → dim/gray
- Curl → dim/gray (indented)

### JSON Format (Production)

```json
{
  "level": "info",
  "time": "2024-01-01T12:00:00.000Z",
  "msg": "GET /account/organizations 200 143ms",
  "requestId": "a1b2c3d4",
  "traceId": "abc123",
  "spanId": "def456",
  "userId": "user-789",
  "organizationId": "org-123",
  "type": "request",
  "duration": 143,
  "status": 200
}
```

Features:

- Single line per log (Loki requirement)
- `type` field for filtering (`request`, `api`, `service`)
- Tokens redacted with `[REDACTED]`
- All context fields at top level for Loki label extraction

## Sentry Integration

### Automatic Context Injection

When creating a request-scoped logger:

```typescript
Sentry.setTag('requestId', context.requestId);
Sentry.setTag('organizationId', context.organizationId);
Sentry.setUser({ id: context.userId });
Sentry.setContext('request', {
  path: context.path,
  method: context.method,
  userAgent: context.userAgent,
});
```

### Breadcrumb Strategy

| Log Type    | Sentry Action                                            |
| ----------- | -------------------------------------------------------- |
| `debug()`   | Skip (too verbose)                                       |
| `info()`    | Breadcrumb (category: "log")                             |
| `api()`     | Breadcrumb (category: "http", data: {url, status, curl}) |
| `service()` | Breadcrumb (category: "service")                         |
| `warn()`    | Breadcrumb (category: "warning")                         |
| `error()`   | Capture exception + breadcrumb                           |

## Integration Points

### 1. Hono Middleware

```typescript
// app/server/middleware/logger.ts
export function loggerMiddleware() {
  return createMiddleware(async (c, next) => {
    const reqLogger = logger.child({
      requestId: c.get('requestId'),
      traceId: Sentry.getCurrentScope().getPropagationContext().traceId,
      spanId: Sentry.getCurrentScope().getPropagationContext().spanId,
      path: c.req.path,
      method: c.req.method,
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('X-Forwarded-For'),
    });

    c.set('logger', reqLogger);
    const start = Date.now();

    await next();

    reqLogger.request({
      status: c.res.status,
      duration: Date.now() - start,
    });
  });
}
```

### 2. Control Plane Client

```typescript
// app/modules/control-plane/control-plane.factory.ts
const onResponse = (response: AxiosResponse): AxiosResponse => {
  const logger = getRequestLogger();
  logger.api({
    method: config.method,
    url: config.url,
    status: response.status,
    duration: Date.now() - config.metadata.startTime,
    curl: config.curlCommand,
  });
  return response;
};
```

### 3. Service Layer

```typescript
// app/resources/organizations/organization.service.ts
async list(ctx: ServiceContext): Promise<OrganizationList> {
  const start = Date.now();
  const result = await this.client.get(...);

  ctx.logger?.service('OrganizationService', 'list', {
    duration: Date.now() - start,
    cached: false,
  });

  return result;
}
```

## Files to Create/Modify

### New Files

- `app/modules/logger/logger.ts` - Logger class
- `app/modules/logger/formatters/pretty.ts` - Pretty formatter
- `app/modules/logger/formatters/json.ts` - JSON formatter
- `app/modules/logger/integrations/sentry.ts` - Sentry helpers
- `app/modules/logger/integrations/curl.ts` - Curl generator with redaction
- `app/modules/logger/utils.ts` - Factory functions

### Modified Files

- `app/modules/logger/index.ts` - Updated exports
- `app/modules/logger/logger.config.ts` - New ENV variables
- `app/modules/logger/logger.types.ts` - Updated interfaces
- `app/server/middleware/logger.ts` - Child logger pattern
- `app/server/types.ts` - Add logger to Variables
- `app/modules/control-plane/control-plane.factory.ts` - Use logger.api()
- `app/resources/base/types.ts` - Add logger to ServiceContext

## Metrics

Logging and metrics are separate concerns:

- **Logs** → Loki (via JSON stdout)
- **Metrics** → Prometheus (via existing `@hono/prometheus` middleware)

No metrics extraction from logs - keeps the logger focused and simple.
