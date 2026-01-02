import type {
  ExportPolicy,
  CreateExportPolicyInput,
  UpdateExportPolicyInput,
} from './export-policy.schema';
import { createExportPolicyService, exportPolicyKeys } from './export-policy.service';
import { useServiceContext } from '@/providers/service.provider';
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
  const ctx = useServiceContext();
  const service = createExportPolicyService(ctx);

  return useQuery({
    queryKey: exportPolicyKeys.list(projectId),
    queryFn: () => service.list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useExportPolicy(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<ExportPolicy>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createExportPolicyService(ctx);

  return useQuery({
    queryKey: exportPolicyKeys.detail(projectId, name),
    queryFn: () => service.get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

export function useCreateExportPolicy(
  projectId: string,
  options?: UseMutationOptions<ExportPolicy, Error, CreateExportPolicyInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createExportPolicyService(ctx);

  return useMutation({
    mutationFn: (input: CreateExportPolicyInput) =>
      service.create(projectId, input) as Promise<ExportPolicy>,
    onSuccess: (newPolicy) => {
      queryClient.invalidateQueries({ queryKey: exportPolicyKeys.lists() });
      queryClient.setQueryData(exportPolicyKeys.detail(projectId, newPolicy.name), newPolicy);
    },
    ...options,
  });
}

type UpdateExportPolicyContext = { previous: ExportPolicy | undefined };

export function useUpdateExportPolicy(
  projectId: string,
  name: string,
  options?: UseMutationOptions<
    ExportPolicy,
    Error,
    UpdateExportPolicyInput,
    UpdateExportPolicyContext
  >
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createExportPolicyService(ctx);

  return useMutation<ExportPolicy, Error, UpdateExportPolicyInput, UpdateExportPolicyContext>({
    mutationFn: (input: UpdateExportPolicyInput) =>
      service.update(projectId, name, input) as Promise<ExportPolicy>,
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: exportPolicyKeys.detail(projectId, name),
      });

      const previous = queryClient.getQueryData<ExportPolicy>(
        exportPolicyKeys.detail(projectId, name)
      );

      if (previous) {
        queryClient.setQueryData(exportPolicyKeys.detail(projectId, name), {
          ...previous,
          sources: input.sources ?? previous.sources,
          sinks: input.sinks ?? previous.sinks,
        });
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(exportPolicyKeys.detail(projectId, name), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: exportPolicyKeys.detail(projectId, name),
      });
      queryClient.invalidateQueries({
        queryKey: exportPolicyKeys.lists(),
      });
    },
    ...options,
  });
}

export function useDeleteExportPolicy(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createExportPolicyService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(projectId, name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({
        queryKey: exportPolicyKeys.detail(projectId, name),
      });
      queryClient.invalidateQueries({
        queryKey: exportPolicyKeys.lists(),
      });
    },
    ...options,
  });
}
