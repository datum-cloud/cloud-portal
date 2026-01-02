import type { Secret, CreateSecretInput, UpdateSecretInput } from './secret.schema';
import { createSecretService, secretKeys } from './secret.service';
import { useServiceContext } from '@/providers/service.provider';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

export function useSecrets(
  projectId: string,
  options?: Omit<UseQueryOptions<Secret[]>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createSecretService(ctx);

  return useQuery({
    queryKey: secretKeys.list(projectId),
    queryFn: () => service.list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useSecret(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<Secret>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createSecretService(ctx);

  return useQuery({
    queryKey: secretKeys.detail(projectId, name),
    queryFn: () => service.get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

export function useCreateSecret(
  projectId: string,
  options?: UseMutationOptions<Secret, Error, CreateSecretInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createSecretService(ctx);

  return useMutation({
    mutationFn: (input: CreateSecretInput) => service.create(projectId, input) as Promise<Secret>,
    onSuccess: (newSecret) => {
      // Force refetch to show updates immediately (watch will keep it in sync after)
      queryClient.refetchQueries({
        queryKey: secretKeys.lists(),
        type: 'active',
      });
      queryClient.setQueryData(secretKeys.detail(projectId, newSecret.name), newSecret);
    },
    onSettled: () => {
      // Invalidate to mark stale for background refetch
      queryClient.invalidateQueries({ queryKey: secretKeys.lists() });
    },
    ...options,
  });
}

export function useUpdateSecret(
  projectId: string,
  name: string,
  options?: UseMutationOptions<Secret, Error, UpdateSecretInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createSecretService(ctx);

  return useMutation({
    mutationFn: (input: UpdateSecretInput) =>
      service.update(projectId, name, input) as Promise<Secret>,
    onSuccess: (data) => {
      // Update cache with actual response from server
      queryClient.setQueryData(secretKeys.detail(projectId, name), data);

      // Force refetch list to show updates immediately (watch will keep it in sync after)
      queryClient.refetchQueries({
        queryKey: secretKeys.lists(),
        type: 'active',
      });
    },
    onSettled: () => {
      // Invalidate to mark stale for background refetch
      queryClient.invalidateQueries({
        queryKey: secretKeys.detail(projectId, name),
      });
      queryClient.invalidateQueries({
        queryKey: secretKeys.lists(),
      });
    },
    ...options,
  });
}

type DeleteSecretContext = { previousData: Secret[] | undefined; queryKey: readonly unknown[] };

export function useDeleteSecret(
  projectId: string,
  options?: UseMutationOptions<void, Error, string, DeleteSecretContext>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createSecretService(ctx);

  const customCallbacks = {
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    onSettled: options?.onSettled,
  };

  return useMutation<void, Error, string, DeleteSecretContext>({
    mutationFn: (name: string) => service.delete(projectId, name),
    onMutate: async (name) => {
      const queryKey = secretKeys.list(projectId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<Secret[]>(queryKey);

      // Optimistically remove the secret from cache
      queryClient.setQueryData<Secret[]>(
        queryKey,
        (old) => old?.filter((secret) => secret.name !== name) ?? []
      );

      return { previousData, queryKey };
    },
    onError: (error, name, context) => {
      // Rollback on error
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      // Call custom onError if provided
      (customCallbacks.onError as any)?.(error, name, undefined, {});
    },
    onSuccess: (data, name) => {
      // Remove the detail query from cache
      queryClient.removeQueries({
        queryKey: secretKeys.detail(projectId, name),
      });

      // Call custom onSuccess if provided
      (customCallbacks.onSuccess as any)?.(data, name, undefined, {});
    },
    onSettled: (data, error, name) => {
      // Refetch to ensure we're in sync with server (watch will also update)
      queryClient.invalidateQueries({ queryKey: secretKeys.lists() });

      // Call custom onSettled if provided
      (customCallbacks.onSettled as any)?.(data, error, name, undefined, {});
    },
  });
}

/**
 * Hydrates React Query cache with SSR data for secrets list.
 */
export function useHydrateSecrets(projectId: string, initialData: Secret[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(secretKeys.list(projectId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single secret.
 */
export function useHydrateSecret(projectId: string, name: string, initialData: Secret) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(secretKeys.detail(projectId, name), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, name, initialData]);
}
