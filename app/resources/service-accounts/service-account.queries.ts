import { preserveKeySummary, withKeySummary } from './service-account.adapter';
import {
  SERVICE_ACCOUNT_SYNC_KIND,
  createServiceAccountService,
  serviceAccountKeys,
} from './service-account.service';
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
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import {
  type QueryClient,
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

/** Service accounts are watched: mutations write the list and never invalidate it. */
export function serviceAccountMutations(projectId: string) {
  return defineResourceMutations<ServiceAccount>({
    kind: SERVICE_ACCOUNT_SYNC_KIND,
    scope: projectId,
    keys: {
      lists: serviceAccountKeys.list(projectId),
      detail: (name) => serviceAccountKeys.detail(projectId, name),
    },
    getName: (account) => account.name,
    getMeta: (account) => ({
      name: account.name,
      resourceVersion: account.resourceVersion,
      deletionTimestamp: account.deletionTimestamp,
    }),
    watched: true,
  });
}

export function toPendingServiceAccount(input: CreateServiceAccountInput): ServiceAccount {
  const now = new Date().toISOString();
  return {
    uid: input.name,
    name: input.name,
    displayName: input.displayName,
    identityEmail: '',
    status: 'Active',
    createdAt: now,
    updatedAt: now,
  };
}

function cachedAccount(
  queryClient: QueryClient,
  projectId: string,
  name: string
): ServiceAccount | undefined {
  return (
    queryClient.getQueryData<ServiceAccount>(serviceAccountKeys.detail(projectId, name)) ??
    queryClient
      .getQueryData<ServiceAccount[]>(serviceAccountKeys.list(projectId))
      ?.find((account) => account.name === name)
  );
}

export function useCreateServiceAccount(
  projectId: string,
  options?: UseMutationOptions<ServiceAccount, Error, CreateServiceAccountInput>
) {
  return useGuardedMutation({
    operation: 'write',
    // A new account has no keys yet, so its summary is known without a fetch.
    mutationFn: async (input: CreateServiceAccountInput) =>
      withKeySummary(await createServiceAccountService().create(projectId, input), []),
    ...withResourceHandlers(
      serviceAccountMutations(projectId).create(toPendingServiceAccount),
      options
    ),
  });
}

export function useUpdateServiceAccount(
  projectId: string,
  name: string,
  options?: UseMutationOptions<ServiceAccount, Error, UpdateServiceAccountInput>
) {
  const queryClient = useQueryClient();
  const handlers = serviceAccountMutations(projectId).update<UpdateServiceAccountInput>((input) => {
    const current = cachedAccount(queryClient, projectId, name);
    return current ? { ...current, ...input } : undefined;
  });

  return useGuardedMutation({
    operation: 'write',
    // The PATCH response is a bare ServiceAccount with no key data, so keep
    // the summary already in cache instead of blanking the status badge.
    mutationFn: async (input: UpdateServiceAccountInput) =>
      preserveKeySummary(
        cachedAccount(queryClient, projectId, name),
        await createServiceAccountService().update(projectId, name, input)
      ),
    ...withResourceHandlers(handlers, options),
  });
}

type ToggleVars = { name: string; status: 'Active' | 'Disabled' };

export function useToggleServiceAccount(
  projectId: string,
  options?: UseMutationOptions<ServiceAccount, Error, ToggleVars>
) {
  const queryClient = useQueryClient();
  const handlers = serviceAccountMutations(projectId).update<ToggleVars>(({ name, status }) => {
    const current = cachedAccount(queryClient, projectId, name);
    return current ? { ...current, status } : undefined;
  });

  return useGuardedMutation({
    operation: 'write',
    mutationFn: async ({ name, status }: ToggleVars) =>
      preserveKeySummary(
        cachedAccount(queryClient, projectId, name),
        await createServiceAccountService().update(projectId, name, { status })
      ),
    ...withResourceHandlers(handlers, options),
  });
}

export function useDeleteServiceAccount(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (name: string) => createServiceAccountService().delete(projectId, name),
    ...withResourceHandlers(
      serviceAccountMutations(projectId).remove<string>((name) => name),
      options
    ),
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
    // Exception to watch-or-invalidate: the account watch carries no keys, so
    // only a refetch updates the key summary on the row and detail.
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
    // Invalidates watched queries on purpose; see useCreateServiceAccountKey.
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
