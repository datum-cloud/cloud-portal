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

/**
 * Create a billing account. On success:
 *   - seeds the detail cache with the server response,
 *   - pushes the new account straight into the per-org list cache so
 *     the listing table updates without waiting for a network round
 *     trip,
 *   - invalidates every list variant (per-org `list(orgId)` and every
 *     cross-org `forOrgs(...)` permutation) so the user-level
 *     `/account/billing` page refreshes too.
 *
 * The watch-driven ADDED event also invalidates `list(orgId)`, but
 * it's skipped during the 2s initial-sync window and depends on the
 * upstream subscription being live at the moment of create. The
 * explicit invalidation here is a belt-and-suspenders guarantee so
 * the table always reflects the new row.
 */
export function useCreateBillingAccount(
  options?: UseMutationOptions<BillingAccount, Error, CreateBillingAccountInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillingAccountInput) => createBillingAccountService().create(input),
    ...options,
    onSuccess: (...args) => {
      const [account, input] = args;
      const name = account.metadata?.name;
      if (name) {
        queryClient.setQueryData(billingAccountKeys.detail(input.orgId, name), account);
        // Optimistically push the new account onto the per-org list
        // cache. Guarded against duplicates because the watch's
        // ADDED event may also seed the same row before the
        // subsequent invalidate refetches.
        queryClient.setQueryData<BillingAccount[]>(billingAccountKeys.list(input.orgId), (old) => {
          if (!old) return [account];
          return old.some((a) => a.metadata?.name === name) ? old : [...old, account];
        });
      }
      // Blanket-invalidate every list variant — the per-org list
      // refetch is cheap (one namespaced LIST) and the cross-org
      // `forOrgs(...)` caches never receive watch traffic, so this
      // is the only thing keeping `/account/billing` honest.
      queryClient.invalidateQueries({ queryKey: billingAccountKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

/** Mutation variables for `useUpdateBillingAccount`. */
export interface UpdateBillingAccountVariables extends UpdateBillingAccountInput {
  orgId: string;
  name: string;
}

/**
 * Patch a billing account in place. On success seeds the detail
 * cache with the server response (so the page title reflects the
 * new value immediately) and invalidates every list variant — the
 * per-org watch will catch the MODIFIED event, but the cross-org
 * `forOrgs(...)` caches don't receive watch traffic, so the
 * invalidation is what keeps `/account/billing` fresh.
 */
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
      queryClient.setQueryData(billingAccountKeys.detail(input.orgId, input.name), account);
      queryClient.invalidateQueries({ queryKey: billingAccountKeys.lists() });
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
 * Delete a billing account. On success:
 *   - removes the detail cache for the deleted resource,
 *   - optimistically splices the row out of the per-org list cache
 *     so the table updates instantly,
 *   - blanket-invalidates every list variant so cross-org caches
 *     (`forOrgs(...)`) and any other observers refetch.
 *
 * The optimistic write matters because the K8s API sets
 * `metadata.deletionTimestamp` on the resource immediately but
 * doesn't drop it from LIST responses until finalizers complete
 * — the service-level `list()` filter skips those tombstones, but
 * the optimistic write avoids the flash where the row reappears
 * for a single render between the invalidate and the refetch
 * returning a tombstone-free list.
 *
 * Per-org watches also evict the row when MODIFIED events carry a
 * `deletionTimestamp`, but the cross-org `for-orgs` caches don't
 * get watch events, so the invalidation is what keeps
 * `/account/billing` honest.
 */
export function useDeleteBillingAccount(
  options?: UseMutationOptions<void, Error, DeleteBillingAccountInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteBillingAccountInput) =>
      createBillingAccountService().delete(input.orgId, input.name),
    ...options,
    onSuccess: (...args) => {
      // `onSuccess` is `(data, variables, context)` — `variables` is
      // the mutation input we passed in (orgId + name).
      const [, input] = args;
      queryClient.removeQueries({
        queryKey: billingAccountKeys.detail(input.orgId, input.name),
      });
      // Optimistically drop the deleted row from the per-org list
      // cache. The subsequent invalidate would do this eventually
      // via refetch, but only after the LIST endpoint stops
      // returning the tombstone — which can take a moment while
      // finalizers run.
      queryClient.setQueryData<BillingAccount[]>(billingAccountKeys.list(input.orgId), (old) =>
        old?.filter((a) => a.metadata?.name !== input.name)
      );
      queryClient.invalidateQueries({ queryKey: billingAccountKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
