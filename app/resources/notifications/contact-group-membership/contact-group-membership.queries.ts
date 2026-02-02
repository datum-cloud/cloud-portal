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

export type CreateNotificationContactGroupMembershipVariables =
  CreateContactGroupMembershipInput & { namespace?: string };

export function useCreateNotificationContactGroupMembership(
  scope: NotificationScope,
  options?: UseMutationOptions<
    ContactGroupMembership,
    Error,
    CreateNotificationContactGroupMembershipVariables
  >
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);
  const listKey = notificationContactGroupMembershipKeys.list(
    scopeKey,
    DEFAULT_NOTIFICATION_NAMESPACE
  );

  return useMutation({
    mutationFn: (input: CreateNotificationContactGroupMembershipVariables) =>
      createNotificationContactGroupMembershipService().create(
        scope,
        input,
        input.namespace ?? DEFAULT_NOTIFICATION_NAMESPACE
      ),
    ...options,
    onSuccess: (...args) => {
      const [created] = args;
      const ns = created.namespace ?? DEFAULT_NOTIFICATION_NAMESPACE;
      queryClient.setQueryData(
        notificationContactGroupMembershipKeys.detail(scopeKey, ns, created.name),
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

export type DeleteNotificationContactGroupMembershipVariables =
  | string
  | { name: string; namespace?: string };

export function useDeleteNotificationContactGroupMembership(
  scope: NotificationScope,
  options?: UseMutationOptions<void, Error, DeleteNotificationContactGroupMembershipVariables>
) {
  const queryClient = useQueryClient();
  const scopeKey = notificationScopeKey(scope);

  return useMutation({
    mutationFn: (arg: DeleteNotificationContactGroupMembershipVariables) => {
      const name = typeof arg === 'string' ? arg : arg.name;
      const namespace =
        typeof arg === 'string'
          ? DEFAULT_NOTIFICATION_NAMESPACE
          : (arg.namespace ?? DEFAULT_NOTIFICATION_NAMESPACE);
      return createNotificationContactGroupMembershipService().delete(scope, name, namespace);
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
        queryKey: notificationContactGroupMembershipKeys.detail(scopeKey, namespace, name),
      });
      queryClient.invalidateQueries({ queryKey: notificationContactGroupMembershipKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
