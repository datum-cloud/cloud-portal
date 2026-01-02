import type {
  PolicyBinding,
  CreatePolicyBindingInput,
  UpdatePolicyBindingInput,
} from './policy-binding.schema';
import { createPolicyBindingService, policyBindingKeys } from './policy-binding.service';
import { useServiceContext } from '@/providers/service.provider';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function usePolicyBindings(
  orgId: string,
  options?: Omit<UseQueryOptions<PolicyBinding[]>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createPolicyBindingService(ctx);

  return useQuery({
    queryKey: policyBindingKeys.list(orgId),
    queryFn: () => service.list(orgId),
    enabled: !!orgId,
    ...options,
  });
}

export function usePolicyBinding(
  orgId: string,
  name: string,
  options?: Omit<UseQueryOptions<PolicyBinding>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createPolicyBindingService(ctx);

  return useQuery({
    queryKey: policyBindingKeys.detail(orgId, name),
    queryFn: () => service.get(orgId, name),
    enabled: !!orgId && !!name,
    ...options,
  });
}

export function useCreatePolicyBinding(
  orgId: string,
  options?: UseMutationOptions<PolicyBinding, Error, CreatePolicyBindingInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createPolicyBindingService(ctx);

  return useMutation({
    mutationFn: (input: CreatePolicyBindingInput) =>
      service.create(orgId, input) as Promise<PolicyBinding>,
    onSuccess: (newPolicyBinding) => {
      queryClient.invalidateQueries({ queryKey: policyBindingKeys.lists() });
      queryClient.setQueryData(
        policyBindingKeys.detail(orgId, newPolicyBinding.name),
        newPolicyBinding
      );
    },
    ...options,
  });
}

type UpdatePolicyBindingContext = { previous: PolicyBinding | undefined };

export function useUpdatePolicyBinding(
  orgId: string,
  name: string,
  options?: UseMutationOptions<
    PolicyBinding,
    Error,
    UpdatePolicyBindingInput,
    UpdatePolicyBindingContext
  >
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createPolicyBindingService(ctx);

  return useMutation<PolicyBinding, Error, UpdatePolicyBindingInput, UpdatePolicyBindingContext>({
    mutationFn: (input: UpdatePolicyBindingInput) =>
      service.update(orgId, name, input) as Promise<PolicyBinding>,
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: policyBindingKeys.detail(orgId, name),
      });

      const previous = queryClient.getQueryData<PolicyBinding>(
        policyBindingKeys.detail(orgId, name)
      );

      if (previous) {
        queryClient.setQueryData(policyBindingKeys.detail(orgId, name), {
          ...previous,
          ...input,
        });
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(policyBindingKeys.detail(orgId, name), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: policyBindingKeys.detail(orgId, name),
      });
      queryClient.invalidateQueries({
        queryKey: policyBindingKeys.lists(),
      });
    },
    ...options,
  });
}

export function useDeletePolicyBinding(
  orgId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createPolicyBindingService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(orgId, name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({
        queryKey: policyBindingKeys.detail(orgId, name),
      });
      queryClient.invalidateQueries({
        queryKey: policyBindingKeys.lists(),
      });
    },
    ...options,
  });
}
