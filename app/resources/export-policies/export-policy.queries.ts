import type {
  ExportPolicy,
  CreateExportPolicyInput,
  UpdateExportPolicyInput,
} from './export-policy.schema';
import { createExportPolicyService, exportPolicyKeys } from './export-policy.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useExportPolicies(
  projectId: string,
  options?: Omit<UseQueryOptions<ExportPolicy[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: exportPolicyKeys.list(projectId),
    queryFn: () => createExportPolicyService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useExportPolicy(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<ExportPolicy>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: exportPolicyKeys.detail(projectId, name),
    queryFn: () => createExportPolicyService().get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

export function useCreateExportPolicy(
  projectId: string,
  options?: UseMutationOptions<ExportPolicy, Error, CreateExportPolicyInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExportPolicyInput) =>
      createExportPolicyService().create(projectId, input) as Promise<ExportPolicy>,
    ...options,
    onSuccess: (...args) => {
      const [newPolicy] = args;
      // Set detail cache - Watch handles list update
      queryClient.setQueryData(exportPolicyKeys.detail(projectId, newPolicy.name), newPolicy);

      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateExportPolicy(
  projectId: string,
  name: string,
  options?: UseMutationOptions<ExportPolicy, Error, UpdateExportPolicyInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateExportPolicyInput) =>
      createExportPolicyService().update(projectId, name, input) as Promise<ExportPolicy>,
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache with server response - Watch handles list sync
      queryClient.setQueryData(exportPolicyKeys.detail(projectId, name), data);

      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteExportPolicy(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createExportPolicyService().delete(projectId, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      // Cancel in-flight queries - Watch handles list update
      await queryClient.cancelQueries({ queryKey: exportPolicyKeys.detail(projectId, name) });

      options?.onSuccess?.(...args);
    },
  });
}
