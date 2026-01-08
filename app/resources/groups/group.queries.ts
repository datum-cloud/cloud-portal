import type { Group, CreateGroupInput, UpdateGroupInput } from './group.schema';
import { createGroupService, groupKeys } from './group.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useGroups(
  orgId: string,
  options?: Omit<UseQueryOptions<Group[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: groupKeys.list(orgId),
    queryFn: () => createGroupService().list(orgId),
    enabled: !!orgId,
    ...options,
  });
}

export function useGroup(
  orgId: string,
  name: string,
  options?: Omit<UseQueryOptions<Group>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: groupKeys.detail(orgId, name),
    queryFn: () => createGroupService().get(orgId, name),
    enabled: !!orgId && !!name,
    ...options,
  });
}

export function useCreateGroup(
  orgId: string,
  options?: UseMutationOptions<Group, Error, CreateGroupInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGroupInput) => createGroupService().create(orgId, input),
    ...options,
    onSuccess: (...args) => {
      const [newGroup] = args;
      // Set detail cache + invalidate list (no Watch for this resource)
      queryClient.setQueryData(groupKeys.detail(orgId, newGroup.name), newGroup);
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateGroup(
  orgId: string,
  name: string,
  options?: UseMutationOptions<Group, Error, UpdateGroupInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateGroupInput) => createGroupService().update(orgId, name, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache + invalidate list (no Watch for this resource)
      queryClient.setQueryData(groupKeys.detail(orgId, name), data);
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteGroup(orgId: string, options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createGroupService().delete(orgId, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      // Cancel in-flight queries + invalidate list (no Watch for this resource)
      await queryClient.cancelQueries({ queryKey: groupKeys.detail(orgId, name) });
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}
