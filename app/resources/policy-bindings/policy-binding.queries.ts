import type {
  PolicyBinding,
  CreatePolicyBindingInput,
  UpdatePolicyBindingInput,
} from './policy-binding.schema';
import { createPolicyBindingService, policyBindingKeys } from './policy-binding.service';
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
  return useQuery({
    queryKey: policyBindingKeys.list(orgId),
    queryFn: () => createPolicyBindingService().list(orgId),
    enabled: !!orgId,
    ...options,
  });
}

export function usePolicyBinding(
  orgId: string,
  name: string,
  options?: Omit<UseQueryOptions<PolicyBinding>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: policyBindingKeys.detail(orgId, name),
    queryFn: () => createPolicyBindingService().get(orgId, name),
    enabled: !!orgId && !!name,
    ...options,
  });
}

export function useCreatePolicyBinding(
  orgId: string,
  options?: UseMutationOptions<PolicyBinding, Error, CreatePolicyBindingInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePolicyBindingInput) =>
      createPolicyBindingService().create(orgId, input) as Promise<PolicyBinding>,
    ...options,
    onSuccess: (...args) => {
      const [newPolicyBinding] = args;
      // Set detail cache + invalidate list (no Watch for this resource)
      queryClient.setQueryData(
        policyBindingKeys.detail(orgId, newPolicyBinding.name),
        newPolicyBinding
      );
      queryClient.invalidateQueries({ queryKey: policyBindingKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdatePolicyBinding(
  orgId: string,
  name: string,
  options?: UseMutationOptions<PolicyBinding, Error, UpdatePolicyBindingInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePolicyBindingInput) =>
      createPolicyBindingService().update(orgId, name, input) as Promise<PolicyBinding>,
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache + invalidate list (no Watch for this resource)
      queryClient.setQueryData(policyBindingKeys.detail(orgId, name), data);
      queryClient.invalidateQueries({ queryKey: policyBindingKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}

export function useDeletePolicyBinding(
  orgId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createPolicyBindingService().delete(orgId, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      // Cancel in-flight queries + invalidate list (no Watch for this resource)
      await queryClient.cancelQueries({ queryKey: policyBindingKeys.detail(orgId, name) });
      queryClient.invalidateQueries({ queryKey: policyBindingKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}
