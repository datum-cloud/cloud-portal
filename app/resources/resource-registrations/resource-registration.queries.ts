import type { ResourceRegistration } from './resource-registration.schema';
import {
  createResourceRegistrationService,
  resourceRegistrationKeys,
} from './resource-registration.service';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

/** Display metadata: world-readable, rarely changes. */
export const RESOURCE_REGISTRATIONS_STALE_TIME = 60 * 60 * 1000;

export function useResourceRegistrations(
  scope: 'organization' | 'project',
  id: string,
  options?: Omit<UseQueryOptions<ResourceRegistration[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: resourceRegistrationKeys.list(scope, id),
    queryFn: () => createResourceRegistrationService().list(scope, id),
    enabled: !!id,
    staleTime: RESOURCE_REGISTRATIONS_STALE_TIME,
    retry: 1,
    ...options,
  });
}
