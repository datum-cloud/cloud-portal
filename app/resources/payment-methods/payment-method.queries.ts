import {
  createPaymentMethodService,
  paymentMethodKeys,
  type CreatePaymentMethodInput,
  type CreatePaymentMethodResult,
} from './payment-method.service';
import type { PaymentMethod } from '@/features/billing/types';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

/** Query the payment methods in one org's namespace. */
export function usePaymentMethods(
  orgId: string | undefined,
  options?: Omit<UseQueryOptions<PaymentMethod[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: paymentMethodKeys.list(orgId ?? ''),
    queryFn: () => createPaymentMethodService().list(orgId!),
    enabled: !!orgId,
    ...options,
  });
}

/**
 * Multi-org payment-method query — fanned out across the supplied
 * org ids.
 */
export function usePaymentMethodsForOrgs(
  orgIds: readonly string[] | undefined,
  options?: Omit<UseQueryOptions<PaymentMethod[]>, 'queryKey' | 'queryFn'>
) {
  const ids = orgIds ?? [];
  return useQuery({
    queryKey: paymentMethodKeys.forOrgs(ids),
    queryFn: () => createPaymentMethodService().listForOrgs(ids),
    enabled: ids.length > 0,
    ...options,
  });
}

/**
 * Create a `PaymentMethod` CRD. The dialog typically chains this
 * with `waitForStripePaymentMethodSetup` to obtain the SetupIntent
 * `clientSecret`; mounting the watch update is optional because the
 * card list watch will pick up the new resource anyway.
 */
export function useCreatePaymentMethod(
  options?: UseMutationOptions<CreatePaymentMethodResult, Error, CreatePaymentMethodInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentMethodInput) => createPaymentMethodService().create(input),
    ...options,
    onSettled: (...args) => {
      const [, , input] = args;
      if (input?.orgId) {
        queryClient.invalidateQueries({
          queryKey: paymentMethodKeys.list(input.orgId),
        });
        // Blanket-invalidate every `for-orgs` cache so cross-org
        // views catch the new card on next render.
        queryClient.invalidateQueries({
          queryKey: paymentMethodKeys.lists(),
        });
      }
      options?.onSettled?.(...args);
    },
  });
}

/** Mutation variables for `useDeletePaymentMethod`. */
export interface DeletePaymentMethodInput {
  orgId: string;
  name: string;
}

/**
 * Delete a `PaymentMethod`. Optimistically splices the row out of the
 * per-org list cache so the card disappears instantly, then settles
 * with a list invalidation (the per-org watch also evicts it when the
 * MODIFIED/DELETED event lands). Rolls back the optimistic write on
 * failure — the most common error is the default-card deletion guard,
 * which surfaces through `onError`.
 */
export function useDeletePaymentMethod(
  options?: UseMutationOptions<
    void,
    Error,
    DeletePaymentMethodInput,
    { previous: PaymentMethod[] | undefined }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeletePaymentMethodInput) =>
      createPaymentMethodService().delete(input.orgId, input.name),
    ...options,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: paymentMethodKeys.list(input.orgId) });
      const previous = queryClient.getQueryData<PaymentMethod[]>(
        paymentMethodKeys.list(input.orgId)
      );
      queryClient.setQueryData<PaymentMethod[]>(paymentMethodKeys.list(input.orgId), (old) =>
        old?.filter((pm) => pm.metadata?.name !== input.name)
      );
      return { previous };
    },
    onError: (error, input, context, ...rest) => {
      if (context?.previous) {
        queryClient.setQueryData(paymentMethodKeys.list(input.orgId), context.previous);
      }
      options?.onError?.(error, input, context, ...rest);
    },
    onSettled: (...args) => {
      const [, , input] = args;
      if (input?.orgId) {
        queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list(input.orgId) });
        queryClient.invalidateQueries({ queryKey: paymentMethodKeys.lists() });
      }
      options?.onSettled?.(...args);
    },
  });
}
