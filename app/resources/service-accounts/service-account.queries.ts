import { preserveKeySummary } from './service-account.adapter';
import { createServiceAccountService, serviceAccountKeys } from './service-account.service';
import type {
  ServiceAccount,
  ServiceAccountKey,
  CreateServiceAccountInput,
  UpdateServiceAccountInput,
  CreateServiceAccountKeyInput,
  CreateServiceAccountKeyResponse,
} from './types';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import {
  useQuery,
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

  return useGuardedMutation({
    operation: 'write',
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

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: UpdateServiceAccountInput) =>
      createServiceAccountService().update(projectId, name, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // The PATCH response is a bare ServiceAccount with no key data, so keep
      // the summary already in cache instead of blanking the status badge.
      queryClient.setQueryData(
        serviceAccountKeys.detail(projectId, name),
        (old: ServiceAccount | undefined) => preserveKeySummary(old, data)
      );
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

  return useGuardedMutation({
    operation: 'write',
    mutationFn: ({ name, status }: { name: string; status: 'Active' | 'Disabled' }) =>
      createServiceAccountService().update(projectId, name, { status }),
    ...options,
    onSuccess: (...args) => {
      const [data, { name }] = args;
      // The PATCH response is a bare ServiceAccount with no key data, so keep
      // the summary already in cache instead of blanking the status badge.
      queryClient.setQueryData(
        serviceAccountKeys.detail(projectId, name),
        (old: ServiceAccount | undefined) => preserveKeySummary(old, data)
      );
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

  return useGuardedMutation({
    operation: 'delete',
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

  return useGuardedMutation({
    operation: 'write',
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
      // The account's credential state is derived from its keys, so the
      // listing's status badge and key count are stale until it refetches.
      queryClient.invalidateQueries({ queryKey: serviceAccountKeys.list(projectId) });
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

  // DELETE, not a write: service-account.service.ts calls
  // deleteIdentityMiloapisComV1Alpha1ServiceAccountKey (HTTP DELETE).
  // Key revocation must keep working during suspension (offboarding).
  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (keyName: string) =>
      createServiceAccountService().revokeKey(projectId, serviceAccountName, keyName),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: serviceAccountKeys.keyList(projectId, serviceAccountName),
      });
      // Revoking the last key leaves the account with no credential at all,
      // which both the detail badge and the listing need to reflect.
      queryClient.invalidateQueries({
        queryKey: serviceAccountKeys.detail(projectId, serviceAccountName),
      });
      queryClient.invalidateQueries({ queryKey: serviceAccountKeys.list(projectId) });
      options?.onSuccess?.(...args);
    },
  });
}
