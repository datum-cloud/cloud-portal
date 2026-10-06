import type {
  ExportPolicy,
  CreateExportPolicyInput,
  UpdateExportPolicyInput,
} from './export-policy.schema';
import {
  EXPORT_POLICY_SYNC_KIND,
  createExportPolicyService,
  exportPolicyKeys,
} from './export-policy.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import {
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import {
  useQuery,
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

/** Export policies are watched: mutations write the list and never invalidate it. */
export function exportPolicyMutations(projectId: string) {
  return defineResourceMutations<ExportPolicy>({
    kind: EXPORT_POLICY_SYNC_KIND,
    scope: projectId,
    keys: {
      lists: exportPolicyKeys.list(projectId),
      detail: (name) => exportPolicyKeys.detail(projectId, name),
    },
    getName: (policy) => policy.name,
    getMeta: (policy) => ({ name: policy.name, resourceVersion: policy.resourceVersion }),
    watched: true,
  });
}

export function toPendingExportPolicy(input: CreateExportPolicyInput): ExportPolicy {
  return {
    uid: input.metadata.name,
    name: input.metadata.name,
    namespace: 'default',
    createdAt: new Date(),
    sources: input.sources,
    sinks: input.sinks,
  };
}

export function useCreateExportPolicy(
  projectId: string,
  options?: UseMutationOptions<ExportPolicy, Error, CreateExportPolicyInput>
) {
  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: CreateExportPolicyInput) =>
      createExportPolicyService().create(projectId, input) as Promise<ExportPolicy>,
    ...withResourceHandlers(
      exportPolicyMutations(projectId).create(toPendingExportPolicy),
      options
    ),
  });
}

export function useUpdateExportPolicy(
  projectId: string,
  name: string,
  options?: UseMutationOptions<ExportPolicy, Error, UpdateExportPolicyInput>
) {
  const queryClient = useQueryClient();
  const handlers = exportPolicyMutations(projectId).update<UpdateExportPolicyInput>((input) => {
    const current = queryClient.getQueryData<ExportPolicy>(
      exportPolicyKeys.detail(projectId, name)
    );
    return current ? { ...current, sources: input.sources, sinks: input.sinks } : undefined;
  });

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: UpdateExportPolicyInput) =>
      createExportPolicyService().update(projectId, name, input) as Promise<ExportPolicy>,
    ...withResourceHandlers(handlers, options),
  });
}

export function useDeleteExportPolicy(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (name: string) => createExportPolicyService().delete(projectId, name),
    ...withResourceHandlers(
      exportPolicyMutations(projectId).remove<string>((name) => name),
      options
    ),
  });
}
