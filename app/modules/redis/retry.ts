export const RELAY_MAX_RETRY_DELAY_MS = 5000;

/** Never returns `null`, so ioredis keeps reconnecting across Redis restarts. */
export function relayRetryDelay(times: number): number {
  return Math.min(times * 200, RELAY_MAX_RETRY_DELAY_MS);
}
