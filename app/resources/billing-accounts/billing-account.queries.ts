import { billingAccountCacheEffects } from './billing-account.cache-effects';
import {
  billingAccountKeys,
  createBillingAccountService,
  type CreateBillingAccountInput,
  type UpdateBillingAccountInput,
} from './billing-account.service';
import type { BillingAccount } from '@/features/billing/types';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

/**
 * Query the billing accounts owned by a single org.
 * Pair with `useBillingAccountsWatch(orgId)` for live cache updates.
 */
export function useBillingAccounts(
  orgId: string | undefined,
  options?: Omit<UseQueryOptions<BillingAccount[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: billingAccountKeys.list(orgId ?? ''),
    queryFn: () => createBillingAccountService().list(orgId!),
    enabled: !!orgId,
    ...options,
  });
}

/**
 * Query every billing account in the supplied orgs. Powers the
 * user-level `/account/billing` listing — fanned out per-org because
 * the cluster-scoped list endpoint is gated by RBAC the portal user
 * doesn't hold.
 */
export function useBillingAccountsForOrgs(
  orgIds: readonly string[] | undefined,
  options?: Omit<UseQueryOptions<BillingAccount[]>, 'queryKey' | 'queryFn'>
) {
  const ids = orgIds ?? [];
  return useQuery({
    queryKey: billingAccountKeys.forOrgs(ids),
    queryFn: () => createBillingAccountService().listForOrgs(ids),
    enabled: ids.length > 0,
    ...options,
  });
}

/**
 * Query a single billing account by `(orgId, name)`.
 */
export function useBillingAccount(
  orgId: string | undefined,
  name: string | undefined,
  options?: Omit<UseQueryOptions<BillingAccount>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: billingAccountKeys.detail(orgId ?? '', name ?? ''),
    queryFn: () => createBillingAccountService().get(orgId!, name!),
    enabled: !!orgId && !!name,
    ...options,
  });
}

/** Also writes the cross-org lists (`/account/billing`), which no watch covers directly. */
export function useCreateBillingAccount(
  options?: UseMutationOptions<BillingAccount, Error, CreateBillingAccountInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillingAccountInput) => createBillingAccountService().create(input),
    ...options,
    onSuccess: (...args) => {
      const [account, input] = args;
      billingAccountCacheEffects.created(queryClient, input.orgId, account);
      options?.onSuccess?.(...args);
    },
  });
}

/** Mutation variables for `useUpdateBillingAccount`. */
export interface UpdateBillingAccountVariables extends UpdateBillingAccountInput {
  orgId: string;
  name: string;
}

export function useUpdateBillingAccount(
  options?: UseMutationOptions<BillingAccount, Error, UpdateBillingAccountVariables>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, name, ...patch }: UpdateBillingAccountVariables) =>
      createBillingAccountService().update(orgId, name, patch),
    ...options,
    onSuccess: (...args) => {
      const [account, input] = args;
      billingAccountCacheEffects.updated(queryClient, input.orgId, account);
      options?.onSuccess?.(...args);
    },
  });
}

/** Mutation variables for `useDeleteBillingAccount`. */
export interface DeleteBillingAccountInput {
  orgId: string;
  name: string;
}

/**
 * LIST keeps a deleted account until finalizers run; the service `list()`
 * filter and the watch both drop rows that carry a deletionTimestamp.
 */
export function useDeleteBillingAccount(
  options?: UseMutationOptions<void, Error, DeleteBillingAccountInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteBillingAccountInput) =>
      createBillingAccountService().delete(input.orgId, input.name),
    ...options,
    onSuccess: async (...args) => {
      const [, input] = args;
      await billingAccountCacheEffects.deleted(queryClient, input.orgId, input.name);
      options?.onSuccess?.(...args);
    },
  });
}
