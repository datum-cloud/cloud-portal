import type { Invitation, CreateInvitationInput } from './invitation.schema';
import { createInvitationService, invitationKeys } from './invitation.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { differenceInMinutes } from 'date-fns';
import { useEffect, useRef } from 'react';

export function useInvitations(
  orgId: string,
  options?: Omit<UseQueryOptions<Invitation[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: invitationKeys.list(orgId),
    queryFn: () => createInvitationService().list(orgId),
    enabled: !!orgId,
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

/**
 * Hydrate React Query cache with SSR invitation data.
 * Runs once on mount to seed the cache, then React Query takes over.
 */
export function useHydrateInvitations(orgId: string, initialData: Invitation[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && orgId && initialData) {
      queryClient.setQueryData(invitationKeys.list(orgId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, orgId, initialData]);
}

export function useCreateInvitation(
  orgId: string,
  options?: UseMutationOptions<Invitation, Error, CreateInvitationInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      createInvitationService().create(orgId, input) as Promise<Invitation>,
    ...options,
    onSuccess: (...args) => {
      options?.onSuccess?.(...args);
    },
    onSettled: (...args) => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: invitationKeys.list(orgId),
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: invitationKeys.userLists(),
        type: 'active',
      });

      options?.onSettled?.(...args);
    },
  });
}

export function useCancelInvitation(
  orgId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createInvitationService().delete(orgId, name),
    ...options,
    onSuccess: (...args) => {
      const [, name] = args;
      queryClient.removeQueries({
        queryKey: invitationKeys.detail(orgId, name),
      });

      options?.onSuccess?.(...args);
    },
    onSettled: (...args) => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: invitationKeys.list(orgId),
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: invitationKeys.userLists(),
        type: 'active',
      });

      options?.onSettled?.(...args);
    },
  });
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

      const newInvitation = (await service.create(orgId, {
        email: invitation.email,
        role: invitation.role,
        roleNamespace: invitation?.roleNamespace ?? 'milo-system',
      })) as Promise<Invitation>;

      return newInvitation;
    },
    ...options,
    onSuccess: (...args) => {
      options?.onSuccess?.(...args);
    },
    onSettled: (...args) => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: invitationKeys.list(orgId),
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: invitationKeys.userLists(),
        type: 'active',
      });

      options?.onSettled?.(...args);
    },
  });
}

type AcceptInvitationInput = {
  orgId: string;
  name: string;
};

export function useAcceptInvitation(
  options?: UseMutationOptions<Invitation, Error, AcceptInvitationInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, name }: AcceptInvitationInput) =>
      createInvitationService().updateState(orgId, name, 'Accepted'),
    ...options,
    onSuccess: (...args) => {
      const [, { orgId, name }] = args;
      queryClient.removeQueries({
        queryKey: invitationKeys.detail(orgId, name),
      });

      options?.onSuccess?.(...args);
    },
    onSettled: (...args) => {
      const [, , { orgId }] = args;
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: invitationKeys.list(orgId),
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: invitationKeys.userLists(),
        type: 'active',
      });

      options?.onSettled?.(...args);
    },
  });
}

type RejectInvitationInput = {
  orgId: string;
  name: string;
};

export function useRejectInvitation(
  options?: UseMutationOptions<Invitation, Error, RejectInvitationInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, name }: RejectInvitationInput) =>
      createInvitationService().updateState(orgId, name, 'Declined'),
    ...options,
    onSuccess: (...args) => {
      const [, { orgId, name }] = args;
      queryClient.removeQueries({
        queryKey: invitationKeys.detail(orgId, name),
      });

      options?.onSuccess?.(...args);
    },
    onSettled: (...args) => {
      const [, , { orgId }] = args;
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: invitationKeys.list(orgId),
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: invitationKeys.userLists(),
        type: 'active',
      });

      options?.onSettled?.(...args);
    },
  });
}
