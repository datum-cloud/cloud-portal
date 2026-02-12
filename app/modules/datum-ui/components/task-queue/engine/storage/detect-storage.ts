import type { RedisClient, TaskStorage } from '../../types';
import { LocalTaskStorage } from './local-storage';
import { MemoryTaskStorage } from './memory-storage';
import { RedisTaskStorage } from './redis-storage';

interface DetectStorageOptions {
  redisClient?: RedisClient | null;
  storageKey?: string;
  storageType?: 'memory' | 'local' | 'auto';
}

/**
 * Auto-detects and returns the appropriate storage backend.
 *
 * Storage types:
 * - `memory` (default): In-memory storage, tasks lost on reload
 * - `local`: Browser localStorage, tasks persist across reloads
 * - `auto`: Uses Redis if available, otherwise localStorage
 *
 * All storage backends are SSR-safe and will return empty data on the server.
 */
export function detectStorage(options: DetectStorageOptions = {}): TaskStorage {
  const { redisClient, storageKey, storageType = 'memory' } = options;

  // Explicit memory storage (default)
  if (storageType === 'memory') {
    return new MemoryTaskStorage();
  }

  // Explicit local storage
  if (storageType === 'local') {
    return new LocalTaskStorage(storageKey);
  }

  // Auto-detect: Redis if available, otherwise localStorage
  if (redisClient && redisClient.status === 'ready') {
    return new RedisTaskStorage(redisClient, storageKey);
  }

  return new LocalTaskStorage(storageKey);
}
