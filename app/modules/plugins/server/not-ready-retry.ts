/**
 * Retries plugins that resolved as not Ready.
 *
 * The watch-backed sources only re-run the manifest pipeline when a resource's
 * spec changes or the watch re-lists (about hourly on milo). A plugin whose
 * host starts serving after its resource is registered — the normal order on a
 * release — would stay hidden until then. This schedules a per-resource retry
 * with exponential backoff until the plugin turns Ready or goes away. Retries
 * only fetch the plugin's manifest; they never call the control plane.
 */

const DEFAULT_INITIAL_DELAY_MS = 15_000;
const DEFAULT_MAX_DELAY_MS = 120_000;

export interface NotReadyRetryOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  /** Injectable timers for tests. */
  setTimer?: (run: () => Promise<void>, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

interface PendingRetry {
  delayMs: number;
  timer?: unknown;
}

function defaultSetTimer(run: () => Promise<void>, ms: number): unknown {
  const timer = setTimeout(() => void run(), ms);
  // Don't keep the process alive solely for plugin retries.
  timer.unref?.();
  return timer;
}

function defaultClearTimer(timer: unknown): void {
  clearTimeout(timer as ReturnType<typeof setTimeout>);
}

export class NotReadyRetry {
  private readonly pending = new Map<string, PendingRetry>();
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly setTimer: NonNullable<NotReadyRetryOptions['setTimer']>;
  private readonly clearTimer: NonNullable<NotReadyRetryOptions['clearTimer']>;
  private stopped = false;

  /** `retry` re-reconciles the named resource and reports back through {@link track}. */
  constructor(
    private readonly retry: (name: string) => Promise<void>,
    private readonly logger: Pick<Console, 'warn'>,
    options: NotReadyRetryOptions = {}
  ) {
    this.initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
    this.maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.setTimer = options.setTimer ?? defaultSetTimer;
    this.clearTimer = options.clearTimer ?? defaultClearTimer;
  }

  /**
   * Records a resource's latest resolution. Ready clears any retry; not Ready
   * schedules one unless a retry is already waiting, doubling the delay each
   * time the resource comes back still not Ready.
   */
  track(name: string, ready: boolean): void {
    if (this.stopped) return;
    if (ready) {
      this.forget(name);
      return;
    }

    const previous = this.pending.get(name);
    if (previous?.timer !== undefined) return;

    const delayMs = previous
      ? Math.min(previous.delayMs * 2, this.maxDelayMs)
      : this.initialDelayMs;
    const timer = this.setTimer(() => this.fire(name), delayMs);
    this.pending.set(name, { delayMs, timer });
  }

  /** Cancels any retry for a resource (deleted or pruned). */
  forget(name: string): void {
    const pending = this.pending.get(name);
    if (pending?.timer !== undefined) this.clearTimer(pending.timer);
    this.pending.delete(name);
  }

  stop(): void {
    this.stopped = true;
    for (const name of [...this.pending.keys()]) this.forget(name);
  }

  private async fire(name: string): Promise<void> {
    const pending = this.pending.get(name);
    if (!pending || this.stopped) return;
    pending.timer = undefined;

    try {
      await this.retry(name);
    } catch (err) {
      this.logger.warn(`[plugins] retry for "${name}" failed: ${String(err)}`);
    }

    // The retry normally reports through track(); if it didn't (it threw, or
    // the resource no longer resolves), keep the backoff going.
    const after = this.pending.get(name);
    if (after && after.timer === undefined) this.track(name, false);
  }
}
