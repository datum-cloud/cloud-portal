// app/modules/hydration/use-hydrate-query.ts
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

interface UseHydrateQueryOptions {
  /**
   * Time in ms before the hydrated data is considered stale.
   * Set to 0 to mark as stale immediately.
   * @default 30000 (30 seconds)
   */
  staleTime?: number;
}

/**
 * Hydrates React Query cache with SSR loader data.
 *
 * Only hydrates once per query key to avoid overwriting client updates.
 * Use this in components that receive data from loaders and want to
 * integrate with React Query for client-side updates.
 *
 * @example
 * ```tsx
 * function DnsZonesPage() {
 *   const { zones } = useLoaderData<typeof loader>();
 *
 *   // Hydrate cache from SSR data
 *   useHydrateQuery(dnsZoneKeys.list(projectId), zones);
 *
 *   // Now React Query hooks will use this data initially
 *   const { data } = useDnsZones(projectId);
 * }
 * ```
 */
export function useHydrateQuery<T>(
  queryKey: readonly unknown[],
  data: T | undefined,
  options: UseHydrateQueryOptions = {}
) {
  const { staleTime = 30_000 } = options;

  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);
  const keyString = JSON.stringify(queryKey);

  useEffect(() => {
    // Only hydrate once and only if we have data
    if (hydratedRef.current || data === undefined) {
      return;
    }

    // Set the data in the cache
    queryClient.setQueryData(queryKey, data, {
      updatedAt: Date.now(),
    });

    // If staleTime is 0, mark as stale immediately
    if (staleTime === 0) {
      queryClient.invalidateQueries({
        queryKey,
        refetchType: 'none', // Don't refetch, just mark stale
      });
    }

    hydratedRef.current = true;
  }, [keyString, data, queryClient, staleTime]);
}
