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

/**
 * Pass a streamed upstream body through, and call `onCutoff` if the deadline
 * in `signal` aborts it before the body finishes. By then the response status
 * has already gone out, so the browser sees a cut-off 200 and nothing else
 * reports it. A body that finishes, or a browser that disconnects, is quiet.
 */
export function reportDeadlineCutoff(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onCutoff: () => void
): ReadableStream<Uint8Array> {
  const onAbort = () => {
    if (isUpstreamTimeout(signal.reason)) onCutoff();
  };
  signal.addEventListener('abort', onAbort, { once: true });
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      flush: () => signal.removeEventListener('abort', onAbort),
    })
  );
}

/** Body of the 504 the proxies answer with when the upstream deadline fires. */
export const UPSTREAM_TIMEOUT_BODY = { error: 'Upstream request timed out' } as const;
