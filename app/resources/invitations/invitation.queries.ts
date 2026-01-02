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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.list(orgId) });
      queryClient.invalidateQueries({ queryKey: invitationKeys.userLists() });
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
      queryClient.invalidateQueries({
        queryKey: invitationKeys.list(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: invitationKeys.userLists(),
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
      await service.delete(orgId, name);
      return service.create(orgId, {
        email: invitation.email,
        role: invitation.role,
      }) as Promise<Invitation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: invitationKeys.list(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: invitationKeys.userLists(),
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
      queryClient.invalidateQueries({
        queryKey: invitationKeys.list(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: invitationKeys.userLists(),
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
      queryClient.invalidateQueries({
        queryKey: invitationKeys.list(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: invitationKeys.userLists(),
      });
    },
    ...options,
  });
}
