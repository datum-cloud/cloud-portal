import { redisConfig } from './config';
import { logger } from '@/modules/logger';
import Redis from 'ioredis';

// Log Redis configuration on startup
if (redisConfig.enabled) {
  logger.info('🔴 Redis: Initializing connection', {
    url: redisConfig.url?.replace(/:[^:@]+@/, ':****@'), // Hide password
    keyPrefix: redisConfig.keyPrefix,
  });
} else {
  logger.info('🔴 Redis: Disabled (using in-memory rate limiting)', {
    reason: 'REDIS_URL not configured',
  });
}

export const redisClient: Redis | null = redisConfig.enabled
  ? new Redis(redisConfig.url!, {
      maxRetriesPerRequest: redisConfig.maxRetries,
      connectTimeout: redisConfig.connectTimeout,
      commandTimeout: redisConfig.commandTimeout,
      keyPrefix: redisConfig.keyPrefix,
      // Connect immediately so readiness reflects actual availability.
      // (We avoid issuing commands until status === 'ready' elsewhere.)
      lazyConnect: false,
      enableOfflineQueue: false, // Fail fast instead of queuing commands
      enableReadyCheck: true, // Wait for Redis to be ready

      retryStrategy(times) {
        if (times > redisConfig.maxRetries) {
          logger.error('🔴 Redis: Max retries reached, giving up', {
            times,
            maxRetries: redisConfig.maxRetries,
          });
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        logger.warn('🔴 Redis: Retrying connection', {
          attempt: times,
          maxRetries: redisConfig.maxRetries,
          delayMs: delay,
        });
        return delay;
      },
    })
  : null;

// Setup event listeners for observability
if (redisClient) {
  redisClient.on('connect', () => {
    logger.info('🔴 Redis: Connected successfully');
  });

  redisClient.on('ready', () => {
    logger.info('🔴 Redis: Ready to accept commands');
  });

  redisClient.on('error', (err) => {
    // Only log meaningful errors (not empty connection errors during retry)
    const errorMessage = err.message || err.toString();
    if (errorMessage && errorMessage !== 'Connection is closed.') {
      logger.error('🔴 Redis: Connection error', {
        error: errorMessage,
        code: (err as any).code,
        syscall: (err as any).syscall,
      });
    }
  });

  redisClient.on('close', () => {
    logger.warn('🔴 Redis: Connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('🔴 Redis: Reconnecting...');
  });

  redisClient.on('end', () => {
    logger.warn('🔴 Redis: Connection ended');
  });
}

/**
 * Check Redis connection health
 */
export async function checkRedisHealth(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
}> {
  if (!redisClient) {
    return { available: false, error: 'Redis not configured' };
  }

  // Check if connection is in a valid state
  if (redisClient.status === 'end' || redisClient.status === 'close') {
    return {
      available: false,
      error: `Redis connection is ${redisClient.status}. Check REDIS_URL and ensure Redis is running.`,
    };
  }

  // With enableOfflineQueue=false, issuing commands before 'ready' throws.
  // Treat non-ready states as unavailable (but non-fatal) for callers.
  if (redisClient.status !== 'ready') {
    return {
      available: false,
      error: `Redis connection is ${redisClient.status}. Waiting for ready...`,
    };
  }

  try {
    const start = Date.now();
    await Promise.race([
      redisClient.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 3000)),
    ]);
    const latency = Date.now() - start;

    logger.info('🔴 Redis: Health check passed', { latencyMs: latency });
    return { available: true, latency };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Only log health check failures if it's not just "connection closed" during startup
    if (errorMessage !== 'Connection is closed.') {
      logger.error('🔴 Redis: Health check failed', { error: errorMessage });
    }

    return { available: false, error: errorMessage };
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    logger.info('🔴 Redis: Closing connection...');
    await redisClient.quit();
    logger.info('🔴 Redis: Connection closed');
  }
}
