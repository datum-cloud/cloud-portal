import { createUserGqlService, userKeys } from './user.gql-service';
import type { UserActiveSession } from './user.schema';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Hook to fetch the user's active sessions via the GraphQL gateway.
 *
 * The gateway calls milo's identity API for raw sessions and decorates each
 * with parsed user-agent and resolved geolocation before returning.
 */
export function useUserActiveSessionsGql(
  userId: string,
  options?: Omit<UseQueryOptions<UserActiveSession[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.activeSessions(userId),
    queryFn: () => createUserGqlService().listSessions(userId),
    enabled: !!userId,
    ...options,
  });
}

/**
 * Hook to revoke a single session via the GraphQL gateway.
 *
 * Invalidates the active-sessions list query on settle so the table refreshes
 * even when the caller has set a non-zero staleTime.
 */
export function useRevokeUserActiveSessionGql(
  userId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => createUserGqlService().revokeSession(userId, sessionId),
    onSettled: () => {
      queryClient.refetchQueries({
        queryKey: userKeys.activeSessions(userId),
        type: 'active',
      });
    },
    ...options,
  });
}

/**
 * Hydrate the GraphQL-backed sessions query from SSR-prefetched data so the
 * first CSR render is a cache hit. Idempotent — only runs once per mount.
 */
export function useHydrateUserActiveSessionsGql(userId: string, initialData: UserActiveSession[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(userKeys.activeSessions(userId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, userId, initialData]);
}
