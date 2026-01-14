import type {
  User,
  UpdateUserPreferencesInput,
  UserSchema,
  UserIdentity,
  UserActiveSession,
} from './user.schema';
import { createUserService, userKeys } from './user.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

export function useUser(
  userId: string,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => createUserService().get(userId),
    enabled: !!userId,
    ...options,
  });
}

export function useCurrentUser(options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>) {
  const userId = 'me';

  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => createUserService().get(userId),
    ...options,
  });
}

export function useUpdateUser(
  userId: string,
  options?: UseMutationOptions<User, Error, UserSchema>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UserSchema) => createUserService().update(userId, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache with server response (no Watch for this resource)
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
      createUserService().updatePreferences(userId, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache with server response (no Watch for this resource)
      queryClient.setQueryData(userKeys.detail(userId), data);

      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteUser(options?: UseMutationOptions<User, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => createUserService().delete(userId),
    ...options,
    onSuccess: async (...args) => {
      const [, userId] = args;
      // Cancel in-flight queries + invalidate all (no Watch for this resource)
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
    queryFn: () => createUserService().getUserIdentity(userId),
    enabled: !!userId,
    ...options,
  });
}

export function useUserActiveSessions(
  userId: string,
  options?: Omit<UseQueryOptions<UserActiveSession[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.activeSessions(userId),
    queryFn: () => createUserService().getUserActiveSessions(userId),
    enabled: !!userId,
    ...options,
  });
}

export function useRevokeUserActiveSession(
  userId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      createUserService().revokeUserActiveSession(userId, sessionId),
    onSettled: () => {
      // Force refetch active queries (works even with staleTime)
      queryClient.refetchQueries({
        queryKey: userKeys.activeSessions(userId),
        type: 'active',
      });
    },
    ...options,
  });
}

export function useHydrateUserActiveSessions(userId: string, initialData: UserActiveSession[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      // Use the same query key format as useDnsRecords and useDnsRecordsWatch
      queryClient.setQueryData(userKeys.activeSessions(userId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, userId, initialData]);
}
