import type { Secret, CreateSecretInput, UpdateSecretInput } from './secret.schema';
import { createSecretService, secretKeys } from './secret.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import { invalidateAllowanceBuckets } from '@/resources/allowance-buckets';
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useSecrets(
  projectId: string,
  options?: Omit<UseQueryOptions<Secret[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: secretKeys.list(projectId),
    queryFn: () => createSecretService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useSecret(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<Secret>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: secretKeys.detail(projectId, name),
    queryFn: () => createSecretService().get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

export function useCreateSecret(
  projectId: string,
  options?: UseMutationOptions<Secret, Error, CreateSecretInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: CreateSecretInput) =>
      createSecretService().create(projectId, input) as Promise<Secret>,
    ...options,
    onSuccess: (...args) => {
      const [newSecret] = args;
      // Set detail cache - Watch handles list update
      queryClient.setQueryData(secretKeys.detail(projectId, newSecret.name), newSecret);
      void invalidateAllowanceBuckets(queryClient);

      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateSecret(
  projectId: string,
  name: string,
  options?: UseMutationOptions<Secret, Error, UpdateSecretInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: UpdateSecretInput) =>
      createSecretService().update(projectId, name, input) as Promise<Secret>,
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache with server response
      queryClient.setQueryData(secretKeys.detail(projectId, name), data);

      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteSecret(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (name: string) => createSecretService().delete(projectId, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      const detailKey = secretKeys.detail(projectId, name);
      // Cancel any in-flight queries for detail
      await queryClient.cancelQueries({ queryKey: detailKey });
      void invalidateAllowanceBuckets(queryClient);

      options?.onSuccess?.(...args);
    },
  });
}
