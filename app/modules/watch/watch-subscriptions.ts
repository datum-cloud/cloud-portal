// Subscribe/unsubscribe requests to the WatchHub, with their retries.
import { RECONNECT_MAX_DELAY_MS, cappedBackoff, type WatchClock } from './watch-clock';
import type { WatchOptions } from './watch.types';
import { noteRateLimitedResponse, parseRetryAfter } from '@/modules/rate-limit';
import type { LogLevel } from '@/modules/sentry/capture';

export const MAX_SUBSCRIBE_FAILURES = 5;

export type WatchBreadcrumb = (
  message: string,
  data?: Record<string, unknown>,
  level?: LogLevel
) => void;

export interface SubscribeHost {
  /** Number of the stream's current connection; a reply for an older one is stale. */
  epoch(): number;
  isConnected(): boolean;
  wants(channel: string): boolean;
  rejected(epoch: number): void;
  exhausted(): void;
  accepted(): void;
}

export interface SubscribeClientOptions {
  clientId: string;
  clock: WatchClock;
  reconnectBaseMs: number;
  breadcrumb: WatchBreadcrumb;
  channelKey: (options: WatchOptions) => string;
}

function subscribeBody(clientId: string, options: WatchOptions): string {
  return JSON.stringify({
    clientId,
    resourceType: options.resourceType,
    orgId: options.orgId,
    projectId: options.projectId,
    namespace: options.namespace,
    name: options.name,
    labelSelector: options.labelSelector,
    fieldSelector: options.fieldSelector,
    userScoped: options.userScoped,
  });
}

/** Retries a network error, 5xx or 429; any other 4xx (such as the subscription cap) is final. */
export class SubscribeClient {
  private failures = new Map<string, number>();

  constructor(
    private readonly host: SubscribeHost,
    private readonly opts: SubscribeClientOptions
  ) {}

  async subscribe(options: WatchOptions): Promise<void> {
    const epoch = this.host.epoch();
    try {
      const response = await fetch('/api/watch/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: subscribeBody(this.opts.clientId, options),
      });
      await this.handleResponse(response, options, epoch);
    } catch (err) {
      this.retryFailed(options, epoch, err);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    this.failures.delete(channel);
    try {
      await fetch('/api/watch/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: this.opts.clientId, channel }),
      });
    } catch {
      // Best effort
    }
  }

  reset(): void {
    this.failures.clear();
  }

  private async handleResponse(
    response: Response,
    options: WatchOptions,
    epoch: number
  ): Promise<void> {
    const channel = this.opts.channelKey(options);
    if (response.status === 429) {
      noteRateLimitedResponse(response.headers);
      const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After')) * 1000;
      this.retryFailed(options, epoch, 'status 429', retryAfterMs);
      return;
    }
    if (response.status === 403 || response.status === 409) {
      // Reached a pod that does not hold this stream; a new stream resubscribes everything.
      this.host.rejected(epoch);
      return;
    }
    if (response.status >= 500) {
      this.retryFailed(options, epoch, `status ${response.status}`);
      return;
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.opts.breadcrumb(
        'watch subscribe refused',
        { status: response.status, body, resourceType: options.resourceType },
        'warn'
      );
      return;
    }
    this.failures.delete(channel);
    // 202: relayed to the pod holding the stream, whose outcome arrives on it. Clearing the
    // reopen backoff here would let a relayed subscribe that keeps failing loop.
    if (response.status !== 202) this.host.accepted();
  }

  private stillWanted(channel: string, epoch: number): boolean {
    return epoch === this.host.epoch() && this.host.isConnected() && this.host.wants(channel);
  }

  // Only while still wanted on this connection: a retry for a channel nobody
  // listens to would open a server-side watch that nothing ever closes.
  private retryFailed(options: WatchOptions, epoch: number, cause: unknown, minDelayMs = 0): void {
    const channel = this.opts.channelKey(options);
    if (!this.stillWanted(channel, epoch)) return;

    const failures = (this.failures.get(channel) ?? 0) + 1;
    this.opts.breadcrumb(
      'watch subscribe failed',
      { failures, resourceType: options.resourceType, cause: String(cause) },
      'warn'
    );
    if (failures >= MAX_SUBSCRIBE_FAILURES) {
      this.host.exhausted();
      return;
    }
    this.failures.set(channel, failures);
    const backoff = cappedBackoff(this.opts.reconnectBaseMs, failures - 1);
    this.opts.clock.setTimeout(
      () => {
        if (this.stillWanted(channel, epoch)) void this.subscribe(options);
      },
      Math.min(Math.max(minDelayMs, backoff), RECONNECT_MAX_DELAY_MS)
    );
  }
}
