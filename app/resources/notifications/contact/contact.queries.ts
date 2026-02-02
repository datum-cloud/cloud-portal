import type { NotificationScope } from '../notification-scope';
import { DEFAULT_NOTIFICATION_NAMESPACE, notificationScopeKey } from '../notification-scope';
import type { Contact, CreateContactInput, UpdateContactInput } from './contact.schema';
import { createNotificationContactService, notificationContactKeys } from './contact.service';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

export function useNotificationContacts(
  scope: NotificationScope,
  options?: Omit<UseQueryOptions<Contact[]>, 'queryKey' | 'queryFn'>
) {
  const scopeKey = notificationScopeKey(scope);

  return useQuery({
    queryKey: notificationContactKeys.list(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE),
    queryFn: () => createNotificationContactService().list(scope),
    enabled: !!scopeKey,
    ...options,
  });
}

export function useNotificationContact(
  scope: NotificationScope,
  name: string,
  options?: Omit<UseQueryOptions<Contact>, 'queryKey' | 'queryFn'>
) {
  const scopeKey = notificationScopeKey(scope);

  return useQuery({
    queryKey: notificationContactKeys.detail(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE, name),
    queryFn: () => createNotificationContactService().get(scope, name),
    enabled: !!scopeKey && !!name,
    ...options,
  });
}

export function useCreateNotificationContact(
  scope: NotificationScope,
  options?: UseMutationOptions<Contact, Error, CreateContactInput>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (input: CreateContactInput) =>
      createNotificationContactService().create(scope, input),
    ...options,
    onSuccess: (...args) => {
      const [created] = args;
      queryClient.setQueryData(
        notificationContactKeys.detail(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE, created.name),
        created
      );
      queryClient.invalidateQueries({ queryKey: notificationContactKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateNotificationContact(
  scope: NotificationScope,
  name: string,
  options?: UseMutationOptions<Contact, Error, UpdateContactInput>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (input: UpdateContactInput) =>
      createNotificationContactService().update(scope, name, input),
    ...options,
    onSuccess: (...args) => {
      const [updated] = args;
      queryClient.setQueryData(
        notificationContactKeys.detail(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE, name),
        updated
      );
      queryClient.invalidateQueries({ queryKey: notificationContactKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteNotificationContact(
  scope: NotificationScope,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (name: string) => createNotificationContactService().delete(scope, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      await queryClient.cancelQueries({
        queryKey: notificationContactKeys.detail(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE, name),
      });
      queryClient.invalidateQueries({ queryKey: notificationContactKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
