import { TASK_STORAGE_KEY } from '../../constants';
import type { RedisClient, Task, TaskStorage } from '../../types';
import { isBrowser } from '../../utils';

// Default TTL: 7 days in seconds
const DEFAULT_TTL = 60 * 60 * 24 * 7;

export class RedisTaskStorage implements TaskStorage {
  private client: RedisClient;
  private key: string;
  private cache: Map<string, Task> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private ttl: number;

  constructor(client: RedisClient, key: string = TASK_STORAGE_KEY, ttl: number = DEFAULT_TTL) {
    this.client = client;
    this.key = key;
    this.ttl = ttl;

    // Auto-initialize on client side, store promise to await later
    if (isBrowser()) {
      this.initPromise = this.initialize();
    }
  }

  /**
   * Wait for initialization to complete.
   * Call this before accessing data if you need guaranteed consistency.
   */
  async waitForInit(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (!isBrowser()) {
      this.initialized = true;
      return;
    }
    try {
      const raw = await this.client.get(this.key);
      if (raw) {
        const tasks = JSON.parse(raw) as Task[];
        tasks.forEach((t) => this.cache.set(t.id, t));
      }
      this.initialized = true;
    } catch {
      this.initialized = true;
    }
  }

  getAll(): Task[] {
    return Array.from(this.cache.values());
  }

  get(id: string): Task | undefined {
    return this.cache.get(id);
  }

  set(id: string, task: Task): void {
    if (!isBrowser()) return;
    this.cache.set(id, task);
    this.syncToRedis();
  }

  remove(id: string): void {
    if (!isBrowser()) return;
    this.cache.delete(id);
    this.syncToRedis();
  }

  clear(): void {
    if (!isBrowser()) return;
    this.cache.clear();
    this.client.del(this.key).catch(() => {});
  }

  private syncToRedis(): void {
    // Strip non-serializable properties but keep _originalItems for retry
    const tasks = this.getAll().map((task) => {
      const { _processor, _icon, _completionActions, ...rest } = task as Task & {
        _processor?: unknown;
        _icon?: unknown;
        _completionActions?: unknown;
      };
      return rest;
    });

    // Use TTL if the client supports it (ioredis style)
    const value = JSON.stringify(tasks);
    if ('setex' in this.client && typeof (this.client as any).setex === 'function') {
      (this.client as any).setex(this.key, this.ttl, value).catch(() => {});
    } else {
      this.client.set(this.key, value).catch(() => {});
    }
  }
}
