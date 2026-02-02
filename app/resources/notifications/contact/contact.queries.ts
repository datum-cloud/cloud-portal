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

export type CreateNotificationContactVariables = CreateContactInput & { namespace?: string };

export function useCreateNotificationContact(
  scope: NotificationScope,
  options?: UseMutationOptions<Contact, Error, CreateNotificationContactVariables>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (input: CreateNotificationContactVariables) =>
      createNotificationContactService().create(
        scope,
        input,
        input.namespace ?? DEFAULT_NOTIFICATION_NAMESPACE
      ),
    ...options,
    onSuccess: (...args) => {
      const [created] = args;
      const ns = created.namespace ?? DEFAULT_NOTIFICATION_NAMESPACE;
      queryClient.setQueryData(notificationContactKeys.detail(scopeKey, ns, created.name), created);
      queryClient.invalidateQueries({ queryKey: notificationContactKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateNotificationContact(
  scope: NotificationScope,
  name: string,
  namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
  options?: UseMutationOptions<Contact, Error, UpdateContactInput>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (input: UpdateContactInput) =>
      createNotificationContactService().update(scope, name, input, namespace),
    ...options,
    onSuccess: (...args) => {
      const [updated] = args;
      const ns = updated.namespace ?? namespace;
      queryClient.setQueryData(notificationContactKeys.detail(scopeKey, ns, name), updated);
      queryClient.invalidateQueries({ queryKey: notificationContactKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

export type DeleteNotificationContactVariables = string | { name: string; namespace?: string };

export function useDeleteNotificationContact(
  scope: NotificationScope,
  options?: UseMutationOptions<void, Error, DeleteNotificationContactVariables>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (arg: DeleteNotificationContactVariables) => {
      const name = typeof arg === 'string' ? arg : arg.name;
      const namespace =
        typeof arg === 'string'
          ? DEFAULT_NOTIFICATION_NAMESPACE
          : (arg.namespace ?? DEFAULT_NOTIFICATION_NAMESPACE);
      return createNotificationContactService().delete(scope, name, namespace);
    },
    ...options,
    onSuccess: async (...args) => {
      const [, arg] = args;
      const name = typeof arg === 'string' ? arg : arg.name;
      const namespace =
        typeof arg === 'string'
          ? DEFAULT_NOTIFICATION_NAMESPACE
          : (arg.namespace ?? DEFAULT_NOTIFICATION_NAMESPACE);
      await queryClient.cancelQueries({
        queryKey: notificationContactKeys.detail(scopeKey, namespace, name),
      });
      queryClient.invalidateQueries({ queryKey: notificationContactKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
