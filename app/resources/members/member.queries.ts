import type { Member, UpdateMemberRoleInput } from './member.schema';
import { createMemberService, memberKeys } from './member.service';
import { useServiceContext } from '@/providers/service.provider';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useMembers(
  orgId: string,
  options?: Omit<UseQueryOptions<Member[]>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createMemberService(ctx);

  return useQuery({
    queryKey: memberKeys.list(orgId),
    queryFn: () => service.list(orgId),
    enabled: !!orgId,
    ...options,
  });
}

export function useMember(
  orgId: string,
  name: string,
  options?: Omit<UseQueryOptions<Member | undefined>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createMemberService(ctx);

  return useQuery({
    queryKey: memberKeys.detail(orgId, name),
    queryFn: async () => {
      const members = await service.list(orgId);
      return members.find((m) => m.name === name);
    },
    enabled: !!orgId && !!name,
    ...options,
  });
}

export function useUpdateMemberRole(
  orgId: string,
  options?: UseMutationOptions<Member, Error, { name: string; roleRef: UpdateMemberRoleInput }>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createMemberService(ctx);

  return useMutation({
    mutationFn: ({ name, roleRef }: { name: string; roleRef: UpdateMemberRoleInput }) =>
      service.updateRole(orgId, name, roleRef),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(orgId) });
    },
    ...options,
  });
}

export function useRemoveMember(orgId: string, options?: UseMutationOptions<void, Error, string>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createMemberService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(orgId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(orgId) });
    },
    ...options,
  });
}

export function useLeaveOrganization(
  options?: UseMutationOptions<void, Error, { orgId: string; memberName: string }>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createMemberService(ctx);

  return useMutation({
    mutationFn: ({ orgId, memberName }: { orgId: string; memberName: string }) =>
      service.delete(orgId, memberName),
    onSuccess: (_data, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(orgId) });
    },
    ...options,
  });
}
