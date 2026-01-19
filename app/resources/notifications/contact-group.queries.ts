import type {
  ContactGroup,
  CreateContactGroupInput,
  UpdateContactGroupInput,
} from './contact-group.schema';
import {
  createNotificationContactGroupService,
  notificationContactGroupKeys,
} from './contact-group.service';
import type { NotificationScope } from './notification-scope';
import { DEFAULT_NOTIFICATION_NAMESPACE, notificationScopeKey } from './notification-scope';
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

export function useCreateNotificationContactGroup(
  scope: NotificationScope,
  options?: UseMutationOptions<ContactGroup, Error, CreateContactGroupInput>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (input: CreateContactGroupInput) =>
      createNotificationContactGroupService().create(scope, input),
    ...options,
    onSuccess: (...args) => {
      const [created] = args;
      queryClient.setQueryData(
        notificationContactGroupKeys.detail(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE, created.name),
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
  options?: UseMutationOptions<ContactGroup, Error, UpdateContactGroupInput>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (input: UpdateContactGroupInput) =>
      createNotificationContactGroupService().update(scope, name, input),
    ...options,
    onSuccess: (...args) => {
      const [updated] = args;
      queryClient.setQueryData(
        notificationContactGroupKeys.detail(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE, name),
        updated
      );
      queryClient.invalidateQueries({ queryKey: notificationContactGroupKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteNotificationContactGroup(
  scope: NotificationScope,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (name: string) => createNotificationContactGroupService().delete(scope, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      await queryClient.cancelQueries({
        queryKey: notificationContactGroupKeys.detail(
          scopeKey,
          DEFAULT_NOTIFICATION_NAMESPACE,
          name
        ),
      });
      queryClient.invalidateQueries({ queryKey: notificationContactGroupKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
