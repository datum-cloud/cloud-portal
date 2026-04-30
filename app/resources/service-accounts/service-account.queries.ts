import { createServiceAccountService, serviceAccountKeys } from './service-account.service';
import type {
  ServiceAccount,
  ServiceAccountKey,
  CreateServiceAccountInput,
  UpdateServiceAccountInput,
  CreateServiceAccountKeyInput,
  CreateServiceAccountKeyResponse,
} from './types';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useServiceAccounts(
  projectId: string,
  options?: Omit<UseQueryOptions<ServiceAccount[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: serviceAccountKeys.list(projectId),
    queryFn: () => createServiceAccountService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useServiceAccount(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<ServiceAccount>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: serviceAccountKeys.detail(projectId, name),
    queryFn: () => createServiceAccountService().get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

export function useCreateServiceAccount(
  projectId: string,
  options?: UseMutationOptions<ServiceAccount, Error, CreateServiceAccountInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateServiceAccountInput) =>
      createServiceAccountService().create(projectId, input),
    ...options,
    onSuccess: (...args) => {
      const [newAccount] = args;
      queryClient.setQueryData(serviceAccountKeys.detail(projectId, newAccount.name), newAccount);
      queryClient.invalidateQueries({ queryKey: serviceAccountKeys.list(projectId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateServiceAccount(
  projectId: string,
  name: string,
  options?: UseMutationOptions<ServiceAccount, Error, UpdateServiceAccountInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateServiceAccountInput) =>
      createServiceAccountService().update(projectId, name, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      queryClient.setQueryData(serviceAccountKeys.detail(projectId, name), data);
      queryClient.invalidateQueries({ queryKey: serviceAccountKeys.list(projectId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useToggleServiceAccount(
  projectId: string,
  options?: UseMutationOptions<
    ServiceAccount,
    Error,
    { name: string; status: 'Active' | 'Disabled' }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, status }: { name: string; status: 'Active' | 'Disabled' }) =>
      createServiceAccountService().update(projectId, name, { status }),
    ...options,
    onSuccess: (...args) => {
      const [data, { name }] = args;
      queryClient.setQueryData(serviceAccountKeys.detail(projectId, name), data);
      queryClient.invalidateQueries({ queryKey: serviceAccountKeys.list(projectId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteServiceAccount(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createServiceAccountService().delete(projectId, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      await queryClient.cancelQueries({ queryKey: serviceAccountKeys.detail(projectId, name) });
      queryClient.setQueryData<ServiceAccount[]>(serviceAccountKeys.list(projectId), (old) =>
        old ? old.filter((a) => a.name !== name) : old
      );
      queryClient.removeQueries({ queryKey: serviceAccountKeys.detail(projectId, name) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useServiceAccountKeys(
  projectId: string,
  serviceAccountName: string,
  serviceAccountEmail: string,
  options?: Omit<UseQueryOptions<ServiceAccountKey[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: serviceAccountKeys.keyList(projectId, serviceAccountName),
    queryFn: () => createServiceAccountService().listKeys(projectId, serviceAccountEmail),
    enabled: !!projectId && !!serviceAccountName && !!serviceAccountEmail,
    ...options,
  });
}

export function useCreateServiceAccountKey(
  projectId: string,
  serviceAccountName: string,
  serviceAccountEmail: string,
  options?: UseMutationOptions<CreateServiceAccountKeyResponse, Error, CreateServiceAccountKeyInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateServiceAccountKeyInput) =>
      createServiceAccountService().createKey(projectId, serviceAccountEmail, input),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: serviceAccountKeys.keyList(projectId, serviceAccountName),
      });
      queryClient.invalidateQueries({
        queryKey: serviceAccountKeys.detail(projectId, serviceAccountName),
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useRevokeServiceAccountKey(
  projectId: string,
  serviceAccountName: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyName: string) =>
      createServiceAccountService().revokeKey(projectId, serviceAccountName, keyName),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: serviceAccountKeys.keyList(projectId, serviceAccountName),
      });
      options?.onSuccess?.(...args);
    },
  });
}
