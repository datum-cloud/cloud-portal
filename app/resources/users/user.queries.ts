import type { User, UpdateUserInput, UpdateUserPreferencesInput } from './user.schema';
import { createUserService, userKeys } from './user.service';
import { useServiceContext } from '@/providers/service.provider';
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
  const ctx = useServiceContext();
  const service = createUserService(ctx);

  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => service.get(userId),
    enabled: !!userId,
    ...options,
  });
}

export function useCurrentUser(options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>) {
  const ctx = useServiceContext();
  const service = createUserService(ctx);
  const userId = 'me';

  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => service.get(userId),
    ...options,
  });
}

type UpdateUserContext = { previous: User | undefined };

export function useUpdateUser(
  userId: string,
  options?: UseMutationOptions<User, Error, UpdateUserInput, UpdateUserContext>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createUserService(ctx);

  return useMutation<User, Error, UpdateUserInput, UpdateUserContext>({
    mutationFn: (input: UpdateUserInput) => service.update(userId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: userKeys.detail(userId),
      });

      const previous = queryClient.getQueryData<User>(userKeys.detail(userId));

      if (previous) {
        queryClient.setQueryData(userKeys.detail(userId), {
          ...previous,
          givenName: input.firstName ?? previous.givenName,
          familyName: input.lastName ?? previous.familyName,
          email: input.email ?? previous.email,
          fullName:
            input.firstName && input.lastName
              ? `${input.firstName} ${input.lastName}`
              : previous.fullName,
        });
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userKeys.detail(userId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(userId),
      });
    },
    ...options,
  });
}

type UpdateUserPreferencesContext = { previous: User | undefined };

export function useUpdateUserPreferences(
  userId: string,
  options?: UseMutationOptions<
    User,
    Error,
    UpdateUserPreferencesInput,
    UpdateUserPreferencesContext
  >
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createUserService(ctx);

  return useMutation<User, Error, UpdateUserPreferencesInput, UpdateUserPreferencesContext>({
    mutationFn: (input: UpdateUserPreferencesInput) => service.updatePreferences(userId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: userKeys.detail(userId),
      });

      const previous = queryClient.getQueryData<User>(userKeys.detail(userId));

      if (previous) {
        queryClient.setQueryData(userKeys.detail(userId), {
          ...previous,
          preferences: {
            ...previous.preferences,
            theme: input.theme ?? previous.preferences?.theme,
            timezone: input.timezone ?? previous.preferences?.timezone,
            newsletter: input.newsletter ?? previous.preferences?.newsletter,
          },
          onboardedAt: input.onboardedAt ?? previous.onboardedAt,
        });
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userKeys.detail(userId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(userId),
      });
    },
    ...options,
  });
}

export function useDeleteUser(options?: UseMutationOptions<User, Error, string>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createUserService(ctx);

  return useMutation({
    mutationFn: (userId: string) => service.delete(userId),
    onSuccess: (_data, userId) => {
      queryClient.removeQueries({
        queryKey: userKeys.detail(userId),
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.all,
      });
    },
    ...options,
  });
}
