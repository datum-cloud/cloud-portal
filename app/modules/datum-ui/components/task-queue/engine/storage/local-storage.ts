import { TASK_STORAGE_KEY } from '../../constants';
import type { Task, TaskStorage } from '../../types';

export class LocalTaskStorage implements TaskStorage {
  private key: string;

  constructor(key: string = TASK_STORAGE_KEY) {
    this.key = key;
  }

  getAll(): Task[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      return JSON.parse(raw) as Task[];
    } catch {
      return [];
    }
  }

  get(id: string): Task | undefined {
    return this.getAll().find((t) => t.id === id);
  }

  set(id: string, task: Task): void {
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
    const tasks = this.getAll().filter((t) => t.id !== id);
    this.persist(tasks);
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // Silently ignore storage errors
    }
  }

  private persist(tasks: Task[]): void {
    try {
      const serializable = tasks.map((task) => {
        const { _processor, _originalItems, icon, completionActions, ...rest } = task as Task & {
          _processor?: unknown;
          _originalItems?: unknown;
        };
        return rest;
      });
      localStorage.setItem(this.key, JSON.stringify(serializable));
    } catch {
      // Silently ignore storage errors (quota exceeded, etc.)
    }
  }
}
