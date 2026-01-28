import { TASK_STORAGE_KEY } from '../../constants';
import type { Task, TaskStorage } from '../../types';

interface RedisLike {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<string | null>;
  del: (key: string) => Promise<number>;
}

export class RedisTaskStorage implements TaskStorage {
  private client: RedisLike;
  private key: string;
  private cache: Map<string, Task> = new Map();
  private initialized = false;

  constructor(client: RedisLike, key: string = TASK_STORAGE_KEY) {
    this.client = client;
    this.key = key;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
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
    this.cache.set(id, task);
    this.syncToRedis();
  }

  remove(id: string): void {
    this.cache.delete(id);
    this.syncToRedis();
  }

  clear(): void {
    this.cache.clear();
    this.client.del(this.key).catch(() => {});
  }

  private syncToRedis(): void {
    const tasks = this.getAll().map((task) => {
      const { _processor, _originalItems, icon, completionActions, ...rest } = task as Task & {
        _processor?: unknown;
        _originalItems?: unknown;
      };
      return rest;
    });
    this.client.set(this.key, JSON.stringify(tasks)).catch(() => {});
  }
}
