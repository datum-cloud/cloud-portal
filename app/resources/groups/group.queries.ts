import type { Group, CreateGroupInput, UpdateGroupInput } from './group.schema';
import { GROUP_SYNC_KIND, createGroupService, groupKeys } from './group.service';
import {
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import { UNWATCHED_LIST_QUERY_OPTIONS } from '@/utils/config/query.config';
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
    ...UNWATCHED_LIST_QUERY_OPTIONS,
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

/** Groups have no watch, so mutations refetch on settle. */
export function groupMutations(orgId: string) {
  return defineResourceMutations<Group>({
    kind: GROUP_SYNC_KIND,
    scope: orgId,
    keys: {
      lists: groupKeys.list(orgId),
      detail: (name) => groupKeys.detail(orgId, name),
    },
    getName: (group) => group.name,
    getMeta: (group) => ({ name: group.name, resourceVersion: group.resourceVersion }),
    watched: false,
  });
}

export function toPendingGroup(orgId: string) {
  return (input: CreateGroupInput): Group => ({
    uid: input.name,
    name: input.name,
    namespace: orgId,
    resourceVersion: '',
    createdAt: new Date().toISOString(),
  });
}

export function useCreateGroup(
  orgId: string,
  options?: UseMutationOptions<Group, Error, CreateGroupInput>
) {
  return useMutation({
    mutationFn: (input: CreateGroupInput) => createGroupService().create(orgId, input),
    ...withResourceHandlers(groupMutations(orgId).create(toPendingGroup(orgId)), options),
  });
}

/** The update only carries a resourceVersion, so the pending state marks the row. */
export function useUpdateGroup(
  orgId: string,
  name: string,
  options?: UseMutationOptions<Group, Error, UpdateGroupInput>
) {
  const queryClient = useQueryClient();
  const handlers = groupMutations(orgId).update<UpdateGroupInput>(() =>
    queryClient.getQueryData<Group[]>(groupKeys.list(orgId))?.find((group) => group.name === name)
  );

  return useMutation({
    mutationFn: (input: UpdateGroupInput) => createGroupService().update(orgId, name, input),
    ...withResourceHandlers(handlers, options),
  });
}

export function useDeleteGroup(orgId: string, options?: UseMutationOptions<void, Error, string>) {
  return useMutation({
    mutationFn: (name: string) => createGroupService().delete(orgId, name),
    ...withResourceHandlers(
      groupMutations(orgId).remove<string>((name) => name),
      options
    ),
  });
}
