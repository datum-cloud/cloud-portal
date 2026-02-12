import type { Task, TaskStorage } from '../../types';

/**
 * In-memory task storage.
 *
 * Tasks are stored in a Map and lost on page reload.
 * Use with beforeunload warning to alert users of active tasks.
 *
 * SSR-safe: works on both server and client (just empty on server).
 */
export class MemoryTaskStorage implements TaskStorage {
  private tasks: Map<string, Task> = new Map();

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  set(id: string, task: Task): void {
    this.tasks.set(id, task);
  }

  remove(id: string): void {
    this.tasks.delete(id);
  }

  clear(): void {
    this.tasks.clear();
  }
}
