import type { Member, UpdateMemberRoleInput } from './member.schema';
import { createMemberService, memberKeys } from './member.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

export function useMembers(
  orgId: string,
  options?: Omit<UseQueryOptions<Member[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: memberKeys.list(orgId),
    queryFn: () => createMemberService().list(orgId),
    enabled: !!orgId,
    ...options,
  });
}

export function useMember(
  orgId: string,
  name: string,
  options?: Omit<UseQueryOptions<Member | undefined>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: memberKeys.detail(orgId, name),
    queryFn: async () => {
      const members = await createMemberService().list(orgId);
      return members.find((m) => m.name === name);
    },
    enabled: !!orgId && !!name,
    ...options,
  });
}

/**
 * Hydrate React Query cache with SSR member data.
 * Runs once on mount to seed the cache, then React Query takes over.
 */
export function useHydrateMembers(orgId: string, initialData: Member[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && orgId && initialData) {
      queryClient.setQueryData(memberKeys.list(orgId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, orgId, initialData]);
}

export function useUpdateMemberRole(
  orgId: string,
  options?: UseMutationOptions<Member, Error, { name: string; roleRef: UpdateMemberRoleInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, roleRef }: { name: string; roleRef: UpdateMemberRoleInput }) =>
      createMemberService().updateRole(orgId, name, roleRef),
    onSettled: () => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: memberKeys.list(orgId),
        type: 'active',
      });
    },
    ...options,
  });
}

export function useRemoveMember(orgId: string, options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createMemberService().delete(orgId, name),
    onSettled: () => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: memberKeys.list(orgId),
        type: 'active',
      });
    },
    ...options,
  });
}

export function useLeaveOrganization(
  options?: UseMutationOptions<void, Error, { orgId: string; memberName: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, memberName }: { orgId: string; memberName: string }) =>
      createMemberService().delete(orgId, memberName),
    onSettled: (_data, _error, { orgId }) => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: memberKeys.list(orgId),
        type: 'active',
      });
    },
    ...options,
  });
}
