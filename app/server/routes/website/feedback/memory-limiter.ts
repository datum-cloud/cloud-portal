import { makeRoom, MEMORY_MAX_ENTRIES } from '../bounded-map';

export interface MemoryWindowLimiterOptions {
  windowMs: number;
  maxPerWindow: number;
  /** Most keys tracked at once; defaults to {@link MEMORY_MAX_ENTRIES}. */
  maxEntries?: number;
  now?: () => number;
}

export interface MemoryWindowLimiter {
  /** Counts one request for `key`; true when it is over the window's budget. */
  overLimit(key: string): boolean;
  size(): number;
}

/**
 * Fixed-window counter held in process memory, for when Redis is unavailable.
 * The map is capped: at the cap it sheds finished windows first and then the
 * oldest live ones, which hands those users a fresh budget rather than letting
 * the map grow with every user who ever sent feedback.
 */
export function createMemoryWindowLimiter({
  windowMs,
  maxPerWindow,
  maxEntries = MEMORY_MAX_ENTRIES,
  now = Date.now,
}: MemoryWindowLimiterOptions): MemoryWindowLimiter {
  const windows = new Map<string, { n: number; resetAt: number }>();

  return {
    overLimit(key) {
      const ts = now();
      const entry = windows.get(key);
      if (!entry || entry.resetAt <= ts) {
        // Delete first so a restarted window counts as the newest insertion.
        windows.delete(key);
        makeRoom(windows, (w) => w.resetAt <= ts, maxEntries);
        windows.set(key, { n: 1, resetAt: ts + windowMs });
        return false;
      }
      if (entry.n >= maxPerWindow) return true;
      windows.set(key, { ...entry, n: entry.n + 1 });
      return false;
    },
    size: () => windows.size,
  };
}
