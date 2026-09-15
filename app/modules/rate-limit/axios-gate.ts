import { bucketFromHeader, notePaused, parseRetryAfter, pausedFor } from './gate';
import { RateLimitError } from '@/utils/errors/app-error';

type RequestLike = { url?: string; baseURL?: string };
type ErrorLike = { response?: { status?: number; headers?: Record<string, unknown> } };

/** The path axios will hit: baseURL joined with url, or the absolute URL's pathname. */
export function axiosRequestPath(config: RequestLike): string {
  const url = config.url ?? '';
  if (/^https?:\/\//.test(url)) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  const base = (config.baseURL ?? '').replace(/\/+$/, '');
  if (!base) return url;
  return `${base}/${url.replace(/^\/+/, '')}`;
}

/** Request interceptor body: throw while the request's bucket is paused. */
export function gateAxiosRequest<T extends RequestLike>(config: T): T {
  const wait = pausedFor(axiosRequestPath(config));
  if (wait > 0) throw new RateLimitError(wait);
  return config;
}

function header(headers: Record<string, unknown> | undefined, name: string): string | null {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return value == null ? null : String(value);
}

/** Response error body: on a 429, record the pause and return the typed error. */
export function rateLimitErrorFromAxios(
  error: ErrorLike,
  requestId?: string
): RateLimitError | null {
  if (error.response?.status !== 429) return null;
  const retryAfter = parseRetryAfter(header(error.response.headers, 'retry-after'));
  notePaused(bucketFromHeader(header(error.response.headers, 'x-ratelimit-class')), retryAfter);
  return new RateLimitError(retryAfter, requestId);
}
