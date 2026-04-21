import type {
  PolicyBinding,
  CreatePolicyBindingInput,
  UpdatePolicyBindingInput,
} from './policy-binding.schema';
import {
  createPolicyBindingService,
  createProjectPolicyBindingService,
  policyBindingKeys,
} from './policy-binding.service';
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

export function useProjectPolicyBindings(
  projectId: string,
  options?: Omit<UseQueryOptions<PolicyBinding[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: policyBindingKeys.list(projectId),
    queryFn: () => createProjectPolicyBindingService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useCreateProjectPolicyBinding(
  projectId: string,
  options?: UseMutationOptions<PolicyBinding, Error, CreatePolicyBindingInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePolicyBindingInput) =>
      createProjectPolicyBindingService().create(projectId, input) as Promise<PolicyBinding>,
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: policyBindingKeys.list(projectId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateProjectPolicyBinding(
  projectId: string,
  name: string,
  options?: UseMutationOptions<PolicyBinding, Error, UpdatePolicyBindingInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePolicyBindingInput) =>
      createProjectPolicyBindingService().update(projectId, name, input) as Promise<PolicyBinding>,
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: policyBindingKeys.list(projectId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteProjectPolicyBinding(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createProjectPolicyBindingService().delete(projectId, name),
    ...options,
    onSuccess: async (...args) => {
      queryClient.invalidateQueries({ queryKey: policyBindingKeys.list(projectId) });
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
      // Immediately remove the deleted binding from cache so the UI updates
      // without waiting for the refetch (avoids stale-data flash on last-item delete).
      queryClient.setQueryData<PolicyBinding[]>(
        policyBindingKeys.list(orgId),
        (old) => old?.filter((b) => b.name !== name) ?? []
      );
      // Cancel stale detail query + kick off a background refetch to confirm
      await queryClient.cancelQueries({ queryKey: policyBindingKeys.detail(orgId, name) });
      queryClient.invalidateQueries({ queryKey: policyBindingKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}
