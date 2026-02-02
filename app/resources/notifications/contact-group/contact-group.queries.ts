import type { NotificationScope } from '../notification-scope';
import { DEFAULT_NOTIFICATION_NAMESPACE, notificationScopeKey } from '../notification-scope';
import type {
  ContactGroup,
  CreateContactGroupInput,
  UpdateContactGroupInput,
} from './contact-group.schema';
import {
  createNotificationContactGroupService,
  notificationContactGroupKeys,
} from './contact-group.service';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

export function useNotificationContactGroups(
  scope: NotificationScope,
  options?: Omit<UseQueryOptions<ContactGroup[]>, 'queryKey' | 'queryFn'>
) {
  const scopeKey = notificationScopeKey(scope);

  return useQuery({
    queryKey: notificationContactGroupKeys.list(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE),
    queryFn: () => createNotificationContactGroupService().list(scope),
    enabled: !!scopeKey,
    ...options,
  });
}

export function useNotificationContactGroup(
  scope: NotificationScope,
  name: string,
  options?: Omit<UseQueryOptions<ContactGroup>, 'queryKey' | 'queryFn'>
) {
  const scopeKey = notificationScopeKey(scope);

  return useQuery({
    queryKey: notificationContactGroupKeys.detail(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE, name),
    queryFn: () => createNotificationContactGroupService().get(scope, name),
    enabled: !!scopeKey && !!name,
    ...options,
  });
}

export type CreateNotificationContactGroupVariables = CreateContactGroupInput & {
  namespace?: string;
};

export function useCreateNotificationContactGroup(
  scope: NotificationScope,
  options?: UseMutationOptions<ContactGroup, Error, CreateNotificationContactGroupVariables>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (input: CreateNotificationContactGroupVariables) =>
      createNotificationContactGroupService().create(
        scope,
        input,
        input.namespace ?? DEFAULT_NOTIFICATION_NAMESPACE
      ),
    ...options,
    onSuccess: (...args) => {
      const [created] = args;
      const ns = created.namespace ?? DEFAULT_NOTIFICATION_NAMESPACE;
      queryClient.setQueryData(
        notificationContactGroupKeys.detail(scopeKey, ns, created.name),
        created
      );
      queryClient.invalidateQueries({ queryKey: notificationContactGroupKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateNotificationContactGroup(
  scope: NotificationScope,
  name: string,
  namespace: string = DEFAULT_NOTIFICATION_NAMESPACE,
  options?: UseMutationOptions<ContactGroup, Error, UpdateContactGroupInput>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (input: UpdateContactGroupInput) =>
      createNotificationContactGroupService().update(scope, name, input, namespace),
    ...options,
    onSuccess: (...args) => {
      const [updated] = args;
      const ns = updated.namespace ?? namespace;
      queryClient.setQueryData(notificationContactGroupKeys.detail(scopeKey, ns, name), updated);
      queryClient.invalidateQueries({ queryKey: notificationContactGroupKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

export type DeleteNotificationContactGroupVariables = string | { name: string; namespace?: string };

export function useDeleteNotificationContactGroup(
  scope: NotificationScope,
  options?: UseMutationOptions<void, Error, DeleteNotificationContactGroupVariables>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (arg: DeleteNotificationContactGroupVariables) => {
      const name = typeof arg === 'string' ? arg : arg.name;
      const namespace =
        typeof arg === 'string'
          ? DEFAULT_NOTIFICATION_NAMESPACE
          : (arg.namespace ?? DEFAULT_NOTIFICATION_NAMESPACE);
      return createNotificationContactGroupService().delete(scope, name, namespace);
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
        queryKey: notificationContactGroupKeys.detail(scopeKey, namespace, name),
      });
      queryClient.invalidateQueries({ queryKey: notificationContactGroupKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
