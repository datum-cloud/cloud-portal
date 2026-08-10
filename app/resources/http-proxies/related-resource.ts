/**
 * Related sub-resources of an HTTPProxy (SecurityPolicy, basic-auth Secret,
 * TrafficProtectionPolicy) can be deleted or become unreadable independently of
 * the proxy itself (#1378). Reads of those resources must degrade the owning
 * card — 404 renders its "not configured" empty state, 403 renders an
 * "insufficient permissions" state — and never hard-fail the page.
 */

export type RelatedResourceState = 'ok' | 'absent' | 'forbidden' | 'error';

export interface RelatedResourceResult<T> {
  state: RelatedResourceState;
  data: T | null;
  /** Original error, present only when state is 'error' (onUnexpected: 'absorb'). */
  error?: unknown;
}

/** HTTP status from an AppError (interceptor) or a raw AxiosError. */
export function getRelatedResourceErrorStatus(error: unknown): number | undefined {
  const e = error as { status?: number; response?: { status?: number } } | null | undefined;
  return typeof e?.status === 'number' ? e.status : e?.response?.status;
}

/**
 * Run a related-resource fetch, translating expected failures into states:
 * 404 → 'absent' (resource not configured), 403 → 'forbidden'. Unexpected
 * errors rethrow by default; pass onUnexpected: 'absorb' at call sites where
 * the fetch runs alongside the primary resource (Promise.all) and must never
 * take the page down — the error is preserved on the result for logging.
 */
export async function resolveRelatedResource<T>(
  fetch: () => Promise<T>,
  options?: { onUnexpected?: 'rethrow' | 'absorb' }
): Promise<RelatedResourceResult<T>> {
  try {
    return { state: 'ok', data: await fetch() };
  } catch (error) {
    const status = getRelatedResourceErrorStatus(error);
    if (status === 404) {
      return { state: 'absent', data: null };
    }
    if (status === 403) {
      return { state: 'forbidden', data: null };
    }
    if (options?.onUnexpected === 'absorb') {
      return { state: 'error', data: null, error };
    }
    throw error;
  }
}
