import { memberCacheEffects, organizationCacheEffects } from './member.cache-effects';
import type { Member, UpdateMemberRoleInput } from './member.schema';
import { MEMBER_SYNC_KIND, createMemberService, memberKeys } from './member.service';
import {
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import { DATUM_ROLE_NAMESPACE } from '@/resources/roles/role.constants';
import { UNWATCHED_LIST_QUERY_OPTIONS } from '@/utils/config/query.config';
import {
  type QueryClient,
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
  return useQuery({
    queryKey: memberKeys.list(orgId),
    queryFn: () => createMemberService().list(orgId),
    enabled: !!orgId,
    ...UNWATCHED_LIST_QUERY_OPTIONS,
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

type RoleRef = { name: string; namespace: string };
type RolesVars = { name: string; roles: RoleRef[] };
type RoleVars = { name: string; roleRef: UpdateMemberRoleInput };

/** Members have no watch, so mutations refetch on settle. */
export function memberMutations(orgId: string) {
  return defineResourceMutations<Member>({
    kind: MEMBER_SYNC_KIND,
    scope: orgId,
    keys: {
      lists: memberKeys.list(orgId),
      detail: (name) => memberKeys.detail(orgId, name),
    },
    getName: (member) => member.name,
    getMeta: (member) => ({ name: member.name, resourceVersion: member.resourceVersion }),
    watched: false,
  });
}

function cachedMember(queryClient: QueryClient, orgId: string, name: string) {
  return queryClient
    .getQueryData<Member[]>(memberKeys.list(orgId))
    ?.find((member) => member.name === name);
}

export function toRolesUpdate(queryClient: QueryClient, orgId: string) {
  return ({ name, roles }: RolesVars): Member | undefined => {
    const current = cachedMember(queryClient, orgId, name);
    return current ? { ...current, roles } : undefined;
  };
}

export function useUpdateMemberRoles(
  orgId: string,
  options?: UseMutationOptions<Member, Error, RolesVars>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, roles }: RolesVars) =>
      createMemberService().updateRoles(orgId, name, roles),
    ...withResourceHandlers(
      memberMutations(orgId).update(toRolesUpdate(queryClient, orgId)),
      options
    ),
  });
}

export function useUpdateMemberRole(
  orgId: string,
  options?: UseMutationOptions<Member, Error, RoleVars>
) {
  const queryClient = useQueryClient();
  const toOptimistic = toRolesUpdate(queryClient, orgId);

  return useMutation({
    mutationFn: ({ name, roleRef }: RoleVars) =>
      createMemberService().updateRole(orgId, name, roleRef),
    ...withResourceHandlers(
      memberMutations(orgId).update<RoleVars>(({ name, roleRef }) =>
        toOptimistic({
          name,
          roles: [{ name: roleRef.role, namespace: roleRef.roleNamespace ?? DATUM_ROLE_NAMESPACE }],
        })
      ),
      options
    ),
  });
}

export function useRemoveMember(orgId: string, options?: UseMutationOptions<void, Error, string>) {
  return useMutation({
    mutationFn: (name: string) => createMemberService().delete(orgId, name),
    ...withResourceHandlers(
      memberMutations(orgId).remove<string>((name) => name),
      options
    ),
  });
}

type LeaveOrganizationInput = { orgId: string; memberName: string };

type LeaveOrganizationOptions = UseMutationOptions<void, Error, LeaveOrganizationInput>;

export function leaveOrganizationOptions(
  queryClient: QueryClient,
  options?: LeaveOrganizationOptions
): LeaveOrganizationOptions {
  return {
    mutationFn: ({ orgId, memberName }: LeaveOrganizationInput) =>
      createMemberService().delete(orgId, memberName),
    ...options,
    onSettled: (...args) => {
      const [, , { orgId }] = args;
      void memberCacheEffects.changed(queryClient, orgId);
      void organizationCacheEffects.membershipChanged(queryClient);
      return options?.onSettled?.(...args);
    },
  };
}

export function useLeaveOrganization(options?: LeaveOrganizationOptions) {
  const queryClient = useQueryClient();
  return useMutation(leaveOrganizationOptions(queryClient, options));
}
