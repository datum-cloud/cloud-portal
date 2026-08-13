import { AppError } from '@/utils/errors/app-error';
import { isAxiosError, type AxiosInstance } from 'axios';

/**
 * globalThis key where upstream-error.server.ts registers
 * `attachUpstreamErrorHandling`. Modules that are part of the client bundle
 * graph (the prometheus and cloudvalid barrels are imported by client
 * components) cannot import a `.server` module directly, so they reach the
 * server implementation through this hook — same pattern as
 * `__axios_server_http__` and `__request_context_store__`.
 */
export const UPSTREAM_ERROR_ATTACH_KEY = '__attach_upstream_error_handling__';

/**
 * Attach the shared upstream error handling when the server runtime has
 * registered it. No-op in the browser, where the hook is never registered.
 */
export function attachUpstreamErrorHandlingIfAvailable(instance: AxiosInstance): void {
  const attach = (globalThis as Record<string, unknown>)[UPSTREAM_ERROR_ATTACH_KEY];
  if (typeof attach === 'function') {
    (attach as (target: AxiosInstance) => void)(instance);
  }
}

/**
 * The shared upstream handler throws typed AppErrors carrying the original
 * AxiosError as `cause`. Instance-specific transforms (PrometheusError,
 * CloudValidError) unwrap it so their own error contracts keep operating on
 * the raw axios failure (status, response body, timeout code).
 */
export function unwrapUpstreamError(error: unknown): unknown {
  return error instanceof AppError && isAxiosError(error.cause) ? error.cause : error;
}
