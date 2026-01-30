import { TASK_STORAGE_KEY } from '../../constants';
import type { Task, TaskStorage } from '../../types';
import { isBrowser } from '../../utils';

export class LocalTaskStorage implements TaskStorage {
  private key: string;

  constructor(key: string = TASK_STORAGE_KEY) {
    this.key = key;
  }

  getAll(): Task[] {
    if (!isBrowser()) return [];
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as Task[]) : [];
    } catch {
      return [];
    }
  }

  get(id: string): Task | undefined {
    if (!isBrowser()) return undefined;
    return this.getAll().find((t) => t.id === id);
  }

  set(id: string, task: Task): void {
    if (!isBrowser()) return;
    const tasks = this.getAll();
    const index = tasks.findIndex((t) => t.id === id);
    if (index >= 0) {
      tasks[index] = task;
    } else {
      tasks.push(task);
    }
    this.persist(tasks);
  }

  remove(id: string): void {
    if (!isBrowser()) return;
    const tasks = this.getAll().filter((t) => t.id !== id);
    this.persist(tasks);
  }

  clear(): void {
    if (!isBrowser()) return;
    try {
      localStorage.removeItem(this.key);
    } catch {
      // Ignore storage errors
    }
  }

  private persist(tasks: Task[]): void {
    try {
      // Strip non-serializable properties but keep _originalItems for retry
      const serializable = tasks.map((task) => {
        const { _processor, _icon, _completionActions, ...rest } = task as Task & {
          _processor?: unknown;
          _icon?: unknown;
          _completionActions?: unknown;
        };
        return rest;
      });
      localStorage.setItem(this.key, JSON.stringify(serializable));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[TaskQueue] Storage quota exceeded. Consider dismissing old tasks.');
      }
    }
  }
}
