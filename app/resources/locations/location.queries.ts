import type { Location } from './location.schema';
import { createLocationService, locationKeys } from './location.service';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export function useLocations(
  projectId: string,
  options?: Omit<UseQueryOptions<Location[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: locationKeys.list(projectId),
    queryFn: () => createLocationService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}
