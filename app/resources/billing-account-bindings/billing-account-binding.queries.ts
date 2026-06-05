import {
  billingAccountBindingKeys,
  createBillingAccountBindingService,
  type CreateBillingAccountBindingInput,
} from './billing-account-binding.service';
import type { BillingAccountBinding } from '@/features/billing/types';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

/** Query the bindings in one org's namespace. */
export function useBillingAccountBindings(
  orgId: string | undefined,
  options?: Omit<UseQueryOptions<BillingAccountBinding[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: billingAccountBindingKeys.list(orgId ?? ''),
    queryFn: () => createBillingAccountBindingService().list(orgId!),
    enabled: !!orgId,
    ...options,
  });
}

/**
 * Multi-org bindings query — fanned out across the supplied org ids.
 * Per-org reads run via `Promise.allSettled` so a failure in one org
 * doesn't blank the rest.
 */
export function useBillingAccountBindingsForOrgs(
  orgIds: readonly string[] | undefined,
  options?: Omit<UseQueryOptions<BillingAccountBinding[]>, 'queryKey' | 'queryFn'>
) {
  const ids = orgIds ?? [];
  return useQuery({
    queryKey: billingAccountBindingKeys.forOrgs(ids),
    queryFn: () => createBillingAccountBindingService().listForOrgs(ids),
    enabled: ids.length > 0,
    ...options,
  });
}

/**
 * Create a new binding (immutable resource, controller marks the
 * previous one `Superseded`). Watches handle list refreshes; this
 * mutation just bumps the per-org list key so freshly-created rows
 * surface even if the watch event lands after the navigation.
 */
export function useCreateBillingAccountBinding(
  options?: UseMutationOptions<BillingAccountBinding, Error, CreateBillingAccountBindingInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillingAccountBindingInput) =>
      createBillingAccountBindingService().create(input),
    ...options,
    onSettled: (...args) => {
      const [, , input] = args;
      if (input?.orgId) {
        queryClient.invalidateQueries({
          queryKey: billingAccountBindingKeys.list(input.orgId),
        });
        // Fan-out cache(s) too. We don't know the exact orgIds the
        // page is using, so blanket-invalidate every `for-orgs`
        // variant under the lists key.
        queryClient.invalidateQueries({
          queryKey: billingAccountBindingKeys.lists(),
        });
      }
      options?.onSettled?.(...args);
    },
  });
}
