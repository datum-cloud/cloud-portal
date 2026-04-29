import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { QueryClient } from '@tanstack/react-query';

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
 * retry: 1 — one quick retry covers transient network blips without
 * compounding latency for users on slower connections.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
