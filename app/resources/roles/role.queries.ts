import type { Role } from './role.schema';
import { createRoleService, roleKeys } from './role.service';
import { useServiceContext } from '@/providers/service.provider';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

/**
 * Hook to fetch all roles in a namespace
 * @param namespace - The namespace to list roles from (defaults to 'datum-cloud')
 * @param options - Additional React Query options
 */
export function useRoles(
  namespace: string = 'datum-cloud',
  options?: Omit<UseQueryOptions<Role[]>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createRoleService(ctx);

  return useQuery({
    queryKey: roleKeys.list(namespace),
    queryFn: () => service.list(namespace),
    ...options,
  });
}

/**
 * Hook to fetch a single role by name
 * @param name - The role name to fetch
 * @param namespace - The namespace (defaults to 'datum-cloud')
 * @param options - Additional React Query options
 */
export function useRole(
  name: string,
  namespace: string = 'datum-cloud',
  options?: Omit<UseQueryOptions<Role>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createRoleService(ctx);

  return useQuery({
    queryKey: roleKeys.detail(namespace, name),
    queryFn: () => service.get(name, namespace),
    enabled: !!name,
    ...options,
  });
}
