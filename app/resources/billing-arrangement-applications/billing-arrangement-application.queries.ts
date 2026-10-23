import {
  billingArrangementApplicationKeys,
  createBillingArrangementApplicationService,
  type CreateBillingArrangementApplicationInput,
} from './billing-arrangement-application.service';
import type { BillingArrangementApplication } from '@/features/billing/types';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

/** Query the payment terms applications in one org's namespace. */
export function useBillingArrangementApplications(
  orgId: string | undefined,
  options?: Omit<UseQueryOptions<BillingArrangementApplication[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: billingArrangementApplicationKeys.list(orgId ?? ''),
    queryFn: () => createBillingArrangementApplicationService().list(orgId!),
    enabled: !!orgId,
    ...options,
  });
}

/** Submit an application for payment terms. */
export function useCreateBillingArrangementApplication(
  options?: UseMutationOptions<
    BillingArrangementApplication,
    Error,
    CreateBillingArrangementApplicationInput
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillingArrangementApplicationInput) =>
      createBillingArrangementApplicationService().create(input),
    ...options,
    onSettled: (...args) => {
      const [, , input] = args;
      if (input?.orgId) {
        queryClient.invalidateQueries({
          queryKey: billingArrangementApplicationKeys.list(input.orgId),
        });
      }
      options?.onSettled?.(...args);
    },
  });
}

/** Mutation variables for `useWithdrawBillingArrangementApplication`. */
export interface WithdrawBillingArrangementApplicationInput {
  orgId: string;
  name: string;
}

/** Withdraw a pending application. */
export function useWithdrawBillingArrangementApplication(
  options?: UseMutationOptions<
    BillingArrangementApplication,
    Error,
    WithdrawBillingArrangementApplicationInput
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WithdrawBillingArrangementApplicationInput) =>
      createBillingArrangementApplicationService().withdraw(input.orgId, input.name),
    ...options,
    onSettled: (...args) => {
      const [, , input] = args;
      if (input?.orgId) {
        queryClient.invalidateQueries({
          queryKey: billingArrangementApplicationKeys.list(input.orgId),
        });
      }
      options?.onSettled?.(...args);
    },
  });
}
