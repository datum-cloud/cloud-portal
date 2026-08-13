import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { isUserFacingErrorStatus } from '@/utils/errors/app-error';
import { QueryClient } from '@tanstack/react-query';

/**
 * Retry predicate for queries.
 *
 * One quick retry covers transient network blips without compounding
 * latency for users on slower connections. Expected user-facing statuses
 * (401/403/404/429) are deterministic — retrying them only doubles error
 * volume and delays the error state, so they never retry.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && !isUserFacingErrorStatus((error as { status?: number })?.status);
}

/**
 * Global TanStack Query defaults.
 *
 * staleTime: 5 minutes — most resources don't change between navigations
 * within the same session. Per-call overrides are still possible via
 * useQuery({ staleTime, ... }).
 *
 * refetchOnWindowFocus: false — cloud-portal uses SSE (WatchHub) for
 * real-time updates of K8s resources; window focus refetch is
 * redundant and noisy in a multi-tab admin UI.
 *
 * retry: shouldRetryQuery — one retry for unexpected failures, none for
 * expected user-facing 4xx.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
    },
  },
});
