import { noteRateLimitedResponse, pausedFor } from './gate';
import { RateLimitError } from '@/utils/errors/app-error';

function pathOf(input: RequestInfo | URL): string {
  if (input instanceof URL) return input.pathname + input.search;
  if (typeof input === 'string') {
    return input.startsWith('http') ? new URL(input).pathname : input;
  }
  return new URL(input.url).pathname;
}

/**
 * `fetch` for the modules that call the API directly (permissions, usage,
 * Prometheus, GraphQL, watch). Rejects with RateLimitError while the path's
 * bucket is paused and records any 429 the server returns. Callers keep
 * their own `response.ok` handling.
 */
export async function gatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const wait = pausedFor(pathOf(input));
  if (wait > 0) throw new RateLimitError(wait);

  const response = await fetch(input, init);
  if (response.status === 429) noteRateLimitedResponse(response.headers);
  return response;
}
