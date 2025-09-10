# Logger Module

This module provides comprehensive logging and error tracking capabilities for the application.

## Structure

```
logger/
├── index.ts          # Main exports and default logger instance
├── logger.ts         # Core Logger class implementation
├── utils.ts          # Logger utility functions
├── sentry.ts         # Sentry error tracking utilities
└── README.md         # This documentation
```

## Core Logger

The `Logger` class provides structured JSON logging with:

- **Context Management**: Add request, user, or session context
- **Caller Information**: Automatic file, line, and column detection
- **Performance Optimized**: Optimized for Bun runtime
- **Debug Mode**: Pretty printing with clickable file links in browser

### Basic Usage

```typescript
import { logger, Logger } from '@/utils/logger';

// Use default logger
logger.info('Application started');

// Create custom logger with context
const userLogger = new Logger({ userId: 'user-123' });
userLogger.info('User action performed');

// Create child logger
const childLogger = logger.child({ sessionId: 'session-456' });
childLogger.debug('Session event');
```

### Convenience Functions

```typescript
import { log } from '@/utils/logger';

log.info('Quick info message');
log.error('Error occurred', { error: 'details' });
log.warn('Warning message');
```

## Utility Functions

### Request Logger

```typescript
import { createRequestLogger } from '@/utils/logger';

// In route handlers
export async function loader({ context }: LoaderArgs) {
  const reqLogger = createRequestLogger(context);
  reqLogger.info('Route loaded');
}
```

### User Logger

```typescript
import { createUserLogger } from '@/utils/logger';

// In authenticated components
const userLogger = createUserLogger(userId);
userLogger.info('User performed action');
```

### Session Logger

```typescript
import { createSessionLogger } from '@/utils/logger';

// In session-aware components
const sessionLogger = createSessionLogger(sessionId);
sessionLogger.debug('Session state changed');
```

## Sentry Integration

The Sentry utilities provide automatic user context tracking for better error debugging:

### User Context Management

```typescript
import { setSentryUser, clearSentryUser } from '@/utils/logger';

// Set user context when user logs in
setSentryUser(userObject);

// Clear user context when user logs out
clearSentryUser();
```

### Breadcrumbs and Context

```typescript
import { addSentryBreadcrumb, setSentryTag } from '@/utils/logger';

// Add custom breadcrumbs
addSentryBreadcrumb('User clicked button', 'user', 'info');

// Set custom tags
setSentryTag('feature', 'dashboard');
```

## Context and Metadata

### Log Context

```typescript
interface LogContext {
  reqId?: string; // Request identifier
  userId?: string; // User identifier
  sessionId?: string; // Session identifier
  [key: string]: any; // Custom context
}
```

### Caller Information

```typescript
interface CallerInfo {
  file?: string; // File name with path context
  fullPath?: string; // Full file path
  line?: number; // Line number
  column?: number; // Column number
}
```

## Performance Features

- **Bun Optimized**: Uses Bun's optimized console.log
- **Stack Trace Parsing**: Efficient caller information extraction
- **Context Merging**: Minimal overhead for context updates
- **Conditional Formatting**: Debug mode only when needed

## Debug Mode

In development, the logger provides:

- **Colored Output**: Different colors for each log level
- **Clickable Links**: Browser console links to source files
- **Pretty Printing**: Human-readable log format
- **Caller Details**: File, line, and column information

## Best Practices

1. **Use Context**: Always include relevant context (reqId, userId, etc.)
2. **Structured Data**: Pass objects as second parameter for better parsing
3. **Appropriate Levels**: Use trace/debug for development, info/warn/error for production
4. **Performance**: Avoid expensive operations in log statements
5. **Consistency**: Use the same logger instance within a component/function

## Examples

### Route Handler

```typescript
import { createRequestLogger } from '@/utils/logger';

export async function loader({ request, context }: LoaderArgs) {
  const logger = createRequestLogger(context);

  logger.info('Route loader started', {
    url: request.url,
    method: request.method,
  });

  try {
    // ... loader logic
    logger.info('Route loaded successfully');
  } catch (error) {
    logger.error('Route loader failed', { error: error.message });
    throw error;
  }
}
```

### Component with User Context

```typescript
import { createUserLogger } from '@/utils/logger';
import { useApp } from '@/providers/app.provider';

function UserComponent() {
  const { user } = useApp();
  const logger = createUserLogger(user?.metadata.uid);

  const handleAction = () => {
    logger.info('User action triggered', { action: 'button_click' });
    // ... action logic
  };

  return <button onClick={handleAction}>Click Me</button>;
}
```

### Sentry Integration

```typescript
import { setSentryUser, addSentryBreadcrumb } from '@/utils/logger';

// In AppProvider when user logs in
useEffect(() => {
  if (user) {
    setSentryUser(user);
    addSentryBreadcrumb('User authenticated', 'auth', 'info');
  }
}, [user]);
```
