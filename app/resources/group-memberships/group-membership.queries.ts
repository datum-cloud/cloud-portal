import type { GroupMembership } from './group-membership.schema';
import {
  createGroupMembershipService,
  groupMembershipKeys,
  type CreateGroupMembershipInput,
} from './group-membership.service';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

export function useGroupMemberships(
  orgId: string,
  options?: Omit<UseQueryOptions<GroupMembership[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: groupMembershipKeys.list(orgId),
    queryFn: () => createGroupMembershipService().list(orgId),
    enabled: !!orgId,
    ...options,
  });
}

export function useCreateGroupMembership(
  orgId: string,
  options?: UseMutationOptions<GroupMembership, Error, CreateGroupMembershipInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupMembershipInput) =>
      createGroupMembershipService().create(orgId, input),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: groupMembershipKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteGroupMembership(
  orgId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipName: string) =>
      createGroupMembershipService().delete(orgId, membershipName),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: groupMembershipKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
