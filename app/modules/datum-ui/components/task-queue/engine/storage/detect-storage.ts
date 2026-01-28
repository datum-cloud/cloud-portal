import type { TaskStorage } from '../../types';
import { LocalTaskStorage } from './local-storage';
import { RedisTaskStorage } from './redis-storage';

interface DetectStorageOptions {
  redisClient?: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<string | null>;
    del: (key: string) => Promise<number>;
    status?: string;
  } | null;
  storageKey?: string;
}

export function detectStorage(options: DetectStorageOptions = {}): TaskStorage {
  const { redisClient, storageKey } = options;

  if (redisClient && redisClient.status === 'ready') {
    return new RedisTaskStorage(redisClient, storageKey);
  }

  return new LocalTaskStorage(storageKey);
}
