import type {
  ContactGroupMembershipRemoval,
  CreateContactGroupMembershipRemovalInput,
} from './contact-group-membership-removal.schema';
import {
  createNotificationContactGroupMembershipRemovalService,
  notificationContactGroupMembershipRemovalKeys,
} from './contact-group-membership-removal.service';
import type { NotificationScope } from './notification-scope';
import { DEFAULT_NOTIFICATION_NAMESPACE, notificationScopeKey } from './notification-scope';
import { notificationContactGroupMembershipKeys } from '@/resources/notifications';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

export function useNotificationContactGroupMembershipRemovals(
  scope: NotificationScope,
  options?: Omit<UseQueryOptions<ContactGroupMembershipRemoval[]>, 'queryKey' | 'queryFn'>
) {
  const scopeKey = notificationScopeKey(scope);

  return useQuery({
    queryKey: notificationContactGroupMembershipRemovalKeys.list(
      scopeKey,
      DEFAULT_NOTIFICATION_NAMESPACE
    ),
    queryFn: () => createNotificationContactGroupMembershipRemovalService().list(scope),
    enabled: !!scopeKey,
    ...options,
  });
}

export function useNotificationContactGroupMembershipRemoval(
  scope: NotificationScope,
  name: string,
  options?: Omit<UseQueryOptions<ContactGroupMembershipRemoval>, 'queryKey' | 'queryFn'>
) {
  const scopeKey = notificationScopeKey(scope);

  return useQuery({
    queryKey: notificationContactGroupMembershipRemovalKeys.detail(
      scopeKey,
      DEFAULT_NOTIFICATION_NAMESPACE,
      name
    ),
    queryFn: () => createNotificationContactGroupMembershipRemovalService().get(scope, name),
    enabled: !!scopeKey && !!name,
    ...options,
  });
}

export function useCreateNotificationContactGroupMembershipRemoval(
  scope: NotificationScope,
  options?: UseMutationOptions<
    ContactGroupMembershipRemoval,
    Error,
    CreateContactGroupMembershipRemovalInput
  >
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);
  const listKey = notificationContactGroupMembershipRemovalKeys.list(
    scopeKey,
    DEFAULT_NOTIFICATION_NAMESPACE
  );

  return useMutation({
    mutationFn: (input: CreateContactGroupMembershipRemovalInput) =>
      createNotificationContactGroupMembershipRemovalService().create(scope, input),
    ...options,
    onSuccess: (...args) => {
      const [created] = args;
      queryClient.setQueryData(
        notificationContactGroupMembershipRemovalKeys.detail(
          scopeKey,
          DEFAULT_NOTIFICATION_NAMESPACE,
          created.name
        ),
        created
      );
      queryClient.setQueryData<ContactGroupMembershipRemoval[] | undefined>(listKey, (old) => {
        const items = old ?? [];
        const idx = items.findIndex((r) => r.name === created.name);
        if (idx === -1) return [...items, created];
        return items.map((r) => (r.name === created.name ? created : r));
      });
      // Invalidate affected lists so UI refreshes membership state.
      queryClient.invalidateQueries({
        queryKey: notificationContactGroupMembershipRemovalKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: notificationContactGroupMembershipKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteNotificationContactGroupMembershipRemoval(
  scope: NotificationScope,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);
  const listKey = notificationContactGroupMembershipRemovalKeys.list(
    scopeKey,
    DEFAULT_NOTIFICATION_NAMESPACE
  );

  return useMutation({
    mutationFn: (name: string) =>
      createNotificationContactGroupMembershipRemovalService().delete(scope, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      await queryClient.cancelQueries({
        queryKey: notificationContactGroupMembershipRemovalKeys.detail(
          scopeKey,
          DEFAULT_NOTIFICATION_NAMESPACE,
          name
        ),
      });
      queryClient.setQueryData<ContactGroupMembershipRemoval[] | undefined>(listKey, (old) => {
        if (!old) return old;
        return old.filter((r) => r.name !== name);
      });
      // Invalidate affected lists so UI refreshes membership state.
      queryClient.invalidateQueries({
        queryKey: notificationContactGroupMembershipRemovalKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: notificationContactGroupMembershipKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
