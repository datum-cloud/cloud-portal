import { invitationCacheEffects } from './invitation.cache-effects';
import type { Invitation, CreateInvitationInput } from './invitation.schema';
import {
  INVITATION_SYNC_KIND,
  createInvitationService,
  invitationKeys,
} from './invitation.service';
import {
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import { memberKeys } from '@/resources/members';
import { MILO_SYSTEM_ROLE_NAMESPACE } from '@/resources/roles/role.constants';
import { UNWATCHED_LIST_QUERY_OPTIONS } from '@/utils/config/query.config';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { differenceInMinutes } from 'date-fns';

export function useInvitations(
  orgId: string,
  options?: Omit<UseQueryOptions<Invitation[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: invitationKeys.list(orgId),
    queryFn: () => createInvitationService().list(orgId),
    enabled: !!orgId,
    ...UNWATCHED_LIST_QUERY_OPTIONS,
    ...options,
  });
}

export function useInvitation(
  orgId: string,
  name: string,
  options?: Omit<UseQueryOptions<Invitation>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: invitationKeys.detail(orgId, name),
    queryFn: () => createInvitationService().get(orgId, name),
    enabled: !!orgId && !!name,
    ...options,
  });
}

export function useUserInvitations(
  userId: string,
  options?: Omit<UseQueryOptions<Invitation[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: invitationKeys.userList(userId),
    queryFn: () => createInvitationService().userInvitations(userId),
    enabled: !!userId,
    ...options,
  });
}

/** The org invitation list has no watch, so every mutation refetches it on settle. */
export function invitationMutations(orgId: string) {
  return defineResourceMutations<Invitation>({
    kind: INVITATION_SYNC_KIND,
    scope: orgId,
    keys: {
      lists: invitationKeys.list(orgId),
      detail: (name) => invitationKeys.detail(orgId, name),
    },
    getName: (invitation) => invitation.name,
    getMeta: (invitation) => ({
      name: invitation.name,
      resourceVersion: invitation.resourceVersion,
    }),
    watched: false,
  });
}

export function toPendingInvitation(orgId: string) {
  return (input: CreateInvitationInput, pendingName: string): Invitation => ({
    uid: pendingName,
    name: pendingName,
    namespace: orgId,
    resourceVersion: '',
    createdAt: new Date().toISOString(),
    email: input.email,
    organizationName: orgId,
    role: input.role,
    roleNamespace: input.roleNamespace,
    state: 'Pending',
  });
}

type CreateInvitationOptions = UseMutationOptions<Invitation, Error, CreateInvitationInput>;

export function createInvitationOptions(
  queryClient: QueryClient,
  orgId: string,
  options?: CreateInvitationOptions
) {
  return {
    mutationFn: (input: CreateInvitationInput) =>
      createInvitationService().create(orgId, input) as Promise<Invitation>,
    ...withResourceHandlers(invitationMutations(orgId).create(toPendingInvitation(orgId)), {
      ...options,
      onSettled: (...args) => {
        queryClient.refetchQueries({ queryKey: invitationKeys.userLists(), type: 'active' });
        queryClient.refetchQueries({ queryKey: memberKeys.list(orgId), type: 'active' });
        return options?.onSettled?.(...args);
      },
    }),
  };
}

export function useCreateInvitation(orgId: string, options?: CreateInvitationOptions) {
  const queryClient = useQueryClient();
  return useMutation(createInvitationOptions(queryClient, orgId, options));
}

export function useCancelInvitation(
  orgId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createInvitationService().delete(orgId, name),
    ...withResourceHandlers(
      invitationMutations(orgId).remove<string>((name) => name),
      {
        ...options,
        onSettled: (...args) => {
          queryClient.refetchQueries({ queryKey: invitationKeys.userLists(), type: 'active' });
          return options?.onSettled?.(...args);
        },
      }
    ),
  });
}

/** A resend deletes and recreates the invitation, so the row comes back under a new name. */
export function resendInvitationHandlers(queryClient: QueryClient, orgId: string) {
  return invitationMutations(orgId).update<string>((name) =>
    queryClient
      .getQueryData<Invitation[]>(invitationKeys.list(orgId))
      ?.find((invitation) => invitation.name === name)
  );
}

export function useResendInvitation(
  orgId: string,
  options?: UseMutationOptions<Invitation, Error, string>
) {
  const queryClient = useQueryClient();
  const service = createInvitationService();

  return useMutation({
    mutationFn: async (name: string) => {
      // Resend by getting the current invitation and creating a new one
      const invitation = await service.get(orgId, name);

      if (invitation?.state !== 'Pending') {
        throw new Error('Invitation is not pending');
      }

      // Check rate limiting - invitation must be older than 10 minutes to resend
      if (invitation?.createdAt) {
        const createdAt = new Date(invitation.createdAt);
        const now = new Date();
        const minutesSinceCreation = differenceInMinutes(now, createdAt);

        if (minutesSinceCreation < 10) {
          const remainingMinutes = 10 - minutesSinceCreation;
          throw new Error(
            `Please wait ${remainingMinutes} more minute${remainingMinutes !== 1 ? 's' : ''} before resending this invitation`
          );
        }
      }

      await service.delete(orgId, name);

      return (await service.create(orgId, {
        email: invitation.email,
        role: invitation.role,
        roleNamespace: invitation?.roleNamespace ?? MILO_SYSTEM_ROLE_NAMESPACE,
      })) as Invitation;
    },
    ...withResourceHandlers(resendInvitationHandlers(queryClient, orgId), {
      ...options,
      onSettled: (...args) => {
        queryClient.refetchQueries({ queryKey: invitationKeys.userLists(), type: 'active' });
        return options?.onSettled?.(...args);
      },
    }),
  });
}

type ResolveInvitationInput = {
  orgId: string;
  name: string;
};

type ResolveInvitationOptions = UseMutationOptions<Invitation, Error, ResolveInvitationInput>;

export function resolveInvitationOptions(
  queryClient: QueryClient,
  state: 'Accepted' | 'Declined',
  options?: ResolveInvitationOptions
): ResolveInvitationOptions {
  return {
    mutationFn: ({ orgId, name }: ResolveInvitationInput) =>
      createInvitationService().updateState(orgId, name, state),
    ...options,
    onSuccess: async (...args) => {
      const [, { orgId, name }] = args;
      // The org's invitations, members and the user's orgs have no watch.
      await invitationCacheEffects.resolved(queryClient, orgId, name);

      options?.onSuccess?.(...args);
    },
    onSettled: (...args) => {
      const [, error, { orgId }] = args;
      if (error) {
        void invitationCacheEffects.orgListChanged(queryClient, orgId);
        queryClient.refetchQueries({
          queryKey: invitationKeys.userLists(),
          type: 'active',
        });
      }

      options?.onSettled?.(...args);
    },
  };
}

function createResolveInvitationHook(state: 'Accepted' | 'Declined') {
  return function useResolveInvitation(options?: ResolveInvitationOptions) {
    const queryClient = useQueryClient();
    return useMutation(resolveInvitationOptions(queryClient, state, options));
  };
}

export const useAcceptInvitation = createResolveInvitationHook('Accepted');

export const useRejectInvitation = createResolveInvitationHook('Declined');
