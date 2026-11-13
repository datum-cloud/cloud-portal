import { UPSTREAM_TIMEOUT_MS } from '@/modules/axios/upstream-timeout';

/**
 * Signal for an upstream `fetch`: aborts when the browser disconnects and,
 * unless `deadline` is false, when the upstream takes longer than
 * {@link UPSTREAM_TIMEOUT_MS}. The deadline covers the whole exchange, body
 * included, and is shared by any retry made with the same signal.
 *
 * Pass `deadline: false` for a K8s watch, which is a stream that stays open
 * for as long as the client listens.
 */
export function upstreamSignal(
  clientSignal: AbortSignal | undefined,
  { deadline = true }: { deadline?: boolean } = {}
): AbortSignal {
  const controller = new AbortController();
  clientSignal?.addEventListener('abort', () => controller.abort(), { once: true });
  if (clientSignal?.aborted) controller.abort();

  return deadline
    ? AbortSignal.any([controller.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)])
    : controller.signal;
}

/** True when `error` is the deadline from {@link upstreamSignal} firing. */
export function isUpstreamTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError';
}

/** Body of the 504 the proxies answer with when the upstream deadline fires. */
export const UPSTREAM_TIMEOUT_BODY = { error: 'Upstream request timed out' } as const;
