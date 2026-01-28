import type { NotificationScope } from '../notification-scope';
import { DEFAULT_NOTIFICATION_NAMESPACE, notificationScopeKey } from '../notification-scope';
import type {
  ContactGroupMembership,
  CreateContactGroupMembershipInput,
} from './contact-group-membership.schema';
import {
  createNotificationContactGroupMembershipService,
  notificationContactGroupMembershipKeys,
} from './contact-group-membership.service';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

export function useNotificationContactGroupMemberships(
  scope: NotificationScope,
  options?: Omit<UseQueryOptions<ContactGroupMembership[]>, 'queryKey' | 'queryFn'>
) {
  const scopeKey = notificationScopeKey(scope);

  return useQuery({
    queryKey: notificationContactGroupMembershipKeys.list(scopeKey, DEFAULT_NOTIFICATION_NAMESPACE),
    queryFn: () => createNotificationContactGroupMembershipService().list(scope),
    enabled: !!scopeKey,
    ...options,
  });
}

export function useNotificationContactGroupMembership(
  scope: NotificationScope,
  name: string,
  options?: Omit<UseQueryOptions<ContactGroupMembership>, 'queryKey' | 'queryFn'>
) {
  const scopeKey = notificationScopeKey(scope);

  return useQuery({
    queryKey: notificationContactGroupMembershipKeys.detail(
      scopeKey,
      DEFAULT_NOTIFICATION_NAMESPACE,
      name
    ),
    queryFn: () => createNotificationContactGroupMembershipService().get(scope, name),
    enabled: !!scopeKey && !!name,
    ...options,
  });
}

export function useCreateNotificationContactGroupMembership(
  scope: NotificationScope,
  options?: UseMutationOptions<ContactGroupMembership, Error, CreateContactGroupMembershipInput>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);
  const listKey = notificationContactGroupMembershipKeys.list(
    scopeKey,
    DEFAULT_NOTIFICATION_NAMESPACE
  );

  return useMutation({
    mutationFn: (input: CreateContactGroupMembershipInput) =>
      createNotificationContactGroupMembershipService().create(scope, input),
    ...options,
    onSuccess: (...args) => {
      const [created] = args;
      queryClient.setQueryData(
        notificationContactGroupMembershipKeys.detail(
          scopeKey,
          DEFAULT_NOTIFICATION_NAMESPACE,
          created.name
        ),
        created
      );
      queryClient.setQueryData<ContactGroupMembership[] | undefined>(listKey, (old) => {
        const items = old ?? [];
        const idx = items.findIndex((m) => m.name === created.name);
        if (idx === -1) return [...items, created];
        return items.map((m) => (m.name === created.name ? created : m));
      });
      queryClient.invalidateQueries({ queryKey: notificationContactGroupMembershipKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteNotificationContactGroupMembership(
  scope: NotificationScope,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (name: string) =>
      createNotificationContactGroupMembershipService().delete(scope, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      await queryClient.cancelQueries({
        queryKey: notificationContactGroupMembershipKeys.detail(
          scopeKey,
          DEFAULT_NOTIFICATION_NAMESPACE,
          name
        ),
      });
      queryClient.invalidateQueries({ queryKey: notificationContactGroupMembershipKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
