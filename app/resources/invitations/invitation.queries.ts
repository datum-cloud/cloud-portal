import type { Invitation, CreateInvitationInput } from './invitation.schema';
import { createInvitationService, invitationKeys } from './invitation.service';
import { useServiceContext } from '@/providers/service.provider';
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
  const ctx = useServiceContext();
  const service = createInvitationService(ctx);

  return useQuery({
    queryKey: invitationKeys.list(orgId),
    queryFn: () => service.list(orgId),
    enabled: !!orgId,
    ...options,
  });
}

export function useInvitation(
  orgId: string,
  name: string,
  options?: Omit<UseQueryOptions<Invitation>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createInvitationService(ctx);

  return useQuery({
    queryKey: invitationKeys.detail(orgId, name),
    queryFn: () => service.get(orgId, name),
    enabled: !!orgId && !!name,
    ...options,
  });
}

export function useUserInvitations(
  userId: string,
  options?: Omit<UseQueryOptions<Invitation[]>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createInvitationService(ctx);

  return useQuery({
    queryKey: invitationKeys.userList(userId),
    queryFn: () => service.userInvitations(userId),
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
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createInvitationService(ctx);

  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      service.create(orgId, input) as Promise<Invitation>,
    onSettled: () => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: invitationKeys.list(orgId),
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: invitationKeys.userLists(),
        type: 'active',
      });
    },
    ...options,
  });
}

export function useCancelInvitation(
  orgId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createInvitationService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(orgId, name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({
        queryKey: invitationKeys.detail(orgId, name),
      });
    },
    onSettled: () => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: invitationKeys.list(orgId),
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: invitationKeys.userLists(),
        type: 'active',
      });
    },
    ...options,
  });
}

export function useResendInvitation(
  orgId: string,
  options?: UseMutationOptions<Invitation, Error, string>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createInvitationService(ctx);

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
    onSettled: () => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: invitationKeys.list(orgId),
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: invitationKeys.userLists(),
        type: 'active',
      });
    },
    ...options,
  });
}

type AcceptInvitationInput = {
  orgId: string;
  name: string;
};

export function useAcceptInvitation(
  options?: UseMutationOptions<Invitation, Error, AcceptInvitationInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createInvitationService(ctx);

  return useMutation({
    mutationFn: ({ orgId, name }: AcceptInvitationInput) =>
      service.updateState(orgId, name, 'Accepted'),
    onSuccess: (_data, { orgId, name }) => {
      queryClient.removeQueries({
        queryKey: invitationKeys.detail(orgId, name),
      });
    },
    onSettled: (_data, _error, { orgId }) => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: invitationKeys.list(orgId),
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: invitationKeys.userLists(),
        type: 'active',
      });
    },
    ...options,
  });
}

type RejectInvitationInput = {
  orgId: string;
  name: string;
};

export function useRejectInvitation(
  options?: UseMutationOptions<Invitation, Error, RejectInvitationInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createInvitationService(ctx);

  return useMutation({
    mutationFn: ({ orgId, name }: RejectInvitationInput) =>
      service.updateState(orgId, name, 'Declined'),
    onSuccess: (_data, { orgId, name }) => {
      queryClient.removeQueries({
        queryKey: invitationKeys.detail(orgId, name),
      });
    },
    onSettled: (_data, _error, { orgId }) => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: invitationKeys.list(orgId),
        type: 'active',
      });
      queryClient.refetchQueries({
        queryKey: invitationKeys.userLists(),
        type: 'active',
      });
    },
    ...options,
  });
}
