import { env } from '@/utils/env/env.server';

export const redisConfig = {
  // Simple: Redis is enabled if URL is provided
  enabled: !!env.server.redisUrl,
  url: env.server.redisUrl,

  // Connection settings
  maxRetries: env.server.redisMaxRetries,
  connectTimeout: env.server.redisConnectTimeout,
  commandTimeout: env.server.redisCommandTimeout,
  keyPrefix: env.server.redisKeyPrefix,
} as const;
