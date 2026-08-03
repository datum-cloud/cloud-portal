import type { AllowanceBucket } from './allowance-bucket.schema';
import { allowanceBucketKeys, createAllowanceBucketService } from './allowance-bucket.service';
import { useQuery, type QueryClient, type UseQueryOptions } from '@tanstack/react-query';

export const ALLOWANCE_BUCKETS_STALE_TIME = 30_000;

export function useAllowanceBuckets(
  scope: 'organization' | 'project',
  id: string,
  options?: Omit<UseQueryOptions<AllowanceBucket[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: allowanceBucketKeys.list(scope, id),
    queryFn: () => createAllowanceBucketService().list(scope, id),
    enabled: !!id,
    staleTime: ALLOWANCE_BUCKETS_STALE_TIME,
    retry: 1,
    ...options,
  });
}

/** Belt-and-suspenders freshness: call from create/delete onSuccess of gated resources. */
export function invalidateAllowanceBuckets(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: allowanceBucketKeys.all });
}
