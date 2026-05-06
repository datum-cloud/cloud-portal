import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createSupportService, supportKeys } from './support.service';
import type { SupportTicket, SupportMessage, CreateTicketInput } from './support.schema';

export function useTickets(
  orgId: string,
  options?: Omit<UseQueryOptions<SupportTicket[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: supportKeys.tickets.list(orgId),
    queryFn: () => createSupportService().listTickets(orgId),
    enabled: !!orgId,
    ...options,
  });
}

export function useTicket(
  name: string,
  options?: Omit<UseQueryOptions<SupportTicket>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: supportKeys.tickets.detail(name),
    queryFn: () => createSupportService().getTicket(name),
    enabled: !!name,
    ...options,
  });
}

export function useMessages(
  ticketName: string,
  options?: Omit<UseQueryOptions<SupportMessage[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: supportKeys.messages.list(ticketName),
    queryFn: () => createSupportService().listMessages(ticketName),
    enabled: !!ticketName,
    ...options,
  });
}

export function useCreateTicket(
  orgId: string,
  options?: UseMutationOptions<
    SupportTicket,
    Error,
    {
      input: CreateTicketInput;
      reporterRef: { name: string; displayName?: string; email?: string };
    }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      reporterRef,
    }: {
      input: CreateTicketInput;
      reporterRef: { name: string; displayName?: string; email?: string };
    }) => createSupportService().createTicket(orgId, input, reporterRef),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets.list(orgId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useCreateMessage(
  ticketName: string,
  options?: UseMutationOptions<
    SupportMessage,
    Error,
    { body: string; authorRef: { name: string; displayName?: string; email?: string } }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      authorRef,
    }: {
      body: string;
      authorRef: { name: string; displayName?: string; email?: string };
    }) => createSupportService().createMessage(ticketName, body, authorRef),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.messages.list(ticketName) });
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets.detail(ticketName) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateMessage(
  ticketName: string,
  options?: UseMutationOptions<SupportMessage, Error, { name: string; body: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: string }) =>
      createSupportService().updateMessage(name, body),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.messages.list(ticketName) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useMarkTicketRead(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketName, principalId }: { ticketName: string; principalId: string }) =>
      createSupportService().markRead(ticketName, principalId),
    onSuccess: (_, { ticketName }) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets.list(orgId) });
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets.detail(ticketName) });
    },
  });
}

export function useUpdateTicketLastActivity(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketName: string) =>
      createSupportService().updateLastActivity(ticketName),
    onSuccess: (_, ticketName) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets.list(orgId) });
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets.detail(ticketName) });
    },
  });
}
