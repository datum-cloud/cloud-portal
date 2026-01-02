import type { Group, CreateGroupInput, UpdateGroupInput } from './group.schema';
import { createGroupService, groupKeys } from './group.service';
import { useServiceContext } from '@/providers/service.provider';
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
  const ctx = useServiceContext();
  const service = createGroupService(ctx);

  return useQuery({
    queryKey: groupKeys.list(orgId),
    queryFn: () => service.list(orgId),
    enabled: !!orgId,
    ...options,
  });
}

export function useGroup(
  orgId: string,
  name: string,
  options?: Omit<UseQueryOptions<Group>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createGroupService(ctx);

  return useQuery({
    queryKey: groupKeys.detail(orgId, name),
    queryFn: () => service.get(orgId, name),
    enabled: !!orgId && !!name,
    ...options,
  });
}

export function useCreateGroup(
  orgId: string,
  options?: UseMutationOptions<Group, Error, CreateGroupInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createGroupService(ctx);

  return useMutation({
    mutationFn: (input: CreateGroupInput) => service.create(orgId, input),
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
      queryClient.setQueryData(groupKeys.detail(orgId, newGroup.name), newGroup);
    },
    ...options,
  });
}

type UpdateGroupContext = { previous: Group | undefined };

export function useUpdateGroup(
  orgId: string,
  name: string,
  options?: UseMutationOptions<Group, Error, UpdateGroupInput, UpdateGroupContext>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createGroupService(ctx);

  return useMutation<Group, Error, UpdateGroupInput, UpdateGroupContext>({
    mutationFn: (input: UpdateGroupInput) => service.update(orgId, name, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: groupKeys.detail(orgId, name),
      });

      const previous = queryClient.getQueryData<Group>(groupKeys.detail(orgId, name));

      if (previous) {
        queryClient.setQueryData(groupKeys.detail(orgId, name), {
          ...previous,
          resourceVersion: input.resourceVersion,
        });
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(groupKeys.detail(orgId, name), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: groupKeys.detail(orgId, name),
      });
      queryClient.invalidateQueries({
        queryKey: groupKeys.lists(),
      });
    },
    ...options,
  });
}

export function useDeleteGroup(orgId: string, options?: UseMutationOptions<void, Error, string>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createGroupService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(orgId, name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({
        queryKey: groupKeys.detail(orgId, name),
      });
      queryClient.invalidateQueries({
        queryKey: groupKeys.lists(),
      });
    },
    ...options,
  });
}
