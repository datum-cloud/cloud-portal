import { createUserGqlService, userKeys } from './user.gql-service';
import type { User, UpdateUserPreferencesInput, UserSchema, UserIdentity } from './user.schema';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useUser(
  userId: string,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => createUserGqlService().get(userId),
    enabled: !!userId,
    ...options,
  });
}

export function useCurrentUser(options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: userKeys.detail('me'),
    queryFn: () => createUserGqlService().get('me'),
    ...options,
  });
}

export function useUpdateUser(
  userId: string,
  options?: UseMutationOptions<User, Error, UserSchema>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UserSchema) => createUserGqlService().update(userId, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      queryClient.setQueryData(userKeys.detail(userId), data);
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateUserPreferences(
  userId: string,
  options?: UseMutationOptions<User, Error, UpdateUserPreferencesInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserPreferencesInput) =>
      createUserGqlService().updatePreferences(userId, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      queryClient.setQueryData(userKeys.detail(userId), data);
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteUser(options?: UseMutationOptions<User, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => createUserGqlService().delete(userId),
    ...options,
    onSuccess: async (...args) => {
      const [, userId] = args;
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUserIdentities(
  userId: string,
  options?: Omit<UseQueryOptions<UserIdentity[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.identities(userId),
    queryFn: () => createUserGqlService().getUserIdentity(userId),
    enabled: !!userId,
    ...options,
  });
}
