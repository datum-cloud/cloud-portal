// app/modules/watch/watch-clock.ts

export type TimerHandle = ReturnType<typeof setTimeout>;

export interface WatchClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

export const systemClock: WatchClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};

export const RECONNECT_MAX_DELAY_MS = 30_000;

export function cappedBackoff(baseMs: number, attempt: number): number {
  return Math.min(baseMs * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
}

/** ±20% jitter so tabs do not retry in lockstep after a deploy. */
export function jitteredBackoff(baseMs: number, attempt: number): number {
  return cappedBackoff(baseMs, attempt) * (0.8 + 0.4 * Math.random());
}

export class OneShotTimer {
  private handle: TimerHandle | null = null;

  constructor(private readonly clock: WatchClock) {}

  start(ms: number, fn: () => void): void {
    this.clear();
    this.handle = this.clock.setTimeout(() => {
      this.handle = null;
      fn();
    }, ms);
  }

  clear(): void {
    if (this.handle === null) return;
    this.clock.clearTimeout(this.handle);
    this.handle = null;
  }

  get pending(): boolean {
    return this.handle !== null;
  }
}
