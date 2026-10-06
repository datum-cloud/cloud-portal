import type {
  PolicyBinding,
  CreatePolicyBindingInput,
  UpdatePolicyBindingInput,
} from './policy-binding.schema';
import {
  POLICY_BINDING_SYNC_KIND,
  createPolicyBindingService,
  createProjectPolicyBindingService,
  policyBindingKeys,
} from './policy-binding.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import {
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import { DATUM_ROLE_NAMESPACE } from '@/resources/roles/role.constants';
import { UNWATCHED_LIST_QUERY_OPTIONS } from '@/utils/config/query.config';
import {
  type QueryClient,
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
    ...UNWATCHED_LIST_QUERY_OPTIONS,
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

/** `scopeId` is an org or project id. Bindings have no watch, so mutations refetch on settle. */
export function policyBindingMutations(scopeId: string) {
  return defineResourceMutations<PolicyBinding>({
    kind: POLICY_BINDING_SYNC_KIND,
    scope: scopeId,
    keys: {
      lists: policyBindingKeys.list(scopeId),
      detail: (name) => policyBindingKeys.detail(scopeId, name),
    },
    getName: (binding) => binding.name,
    getMeta: (binding) => ({ name: binding.name, resourceVersion: binding.resourceVersion }),
    watched: false,
  });
}

const roleRefOf = (input: CreatePolicyBindingInput) => ({
  name: input.role,
  namespace: input.roleNamespace ?? DATUM_ROLE_NAMESPACE,
});

const subjectsOf = (input: CreatePolicyBindingInput): PolicyBinding['subjects'] =>
  input.subjects.map((subject) => ({ kind: subject.kind, name: subject.name, uid: subject.uid }));

export function toPendingPolicyBinding(scopeId: string) {
  return (input: CreatePolicyBindingInput, pendingName: string): PolicyBinding => ({
    uid: pendingName,
    name: pendingName,
    namespace: scopeId,
    resourceVersion: '',
    createdAt: new Date().toISOString(),
    roleRef: roleRefOf(input),
    subjects: subjectsOf(input),
  });
}

function toPolicyBindingUpdate(queryClient: QueryClient, scopeId: string, name: string) {
  return (input: UpdatePolicyBindingInput): PolicyBinding | undefined => {
    const current = queryClient
      .getQueryData<PolicyBinding[]>(policyBindingKeys.list(scopeId))
      ?.find((binding) => binding.name === name);
    return current
      ? { ...current, roleRef: roleRefOf(input), subjects: subjectsOf(input) }
      : undefined;
  };
}

export function useCreatePolicyBinding(
  orgId: string,
  options?: UseMutationOptions<PolicyBinding, Error, CreatePolicyBindingInput>
) {
  return useMutation({
    mutationFn: (input: CreatePolicyBindingInput) =>
      createPolicyBindingService().create(orgId, input) as Promise<PolicyBinding>,
    ...withResourceHandlers(
      policyBindingMutations(orgId).create(toPendingPolicyBinding(orgId)),
      options
    ),
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
    ...withResourceHandlers(
      policyBindingMutations(orgId).update(toPolicyBindingUpdate(queryClient, orgId, name)),
      options
    ),
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
    ...UNWATCHED_LIST_QUERY_OPTIONS,
    ...options,
  });
}

export function useCreateProjectPolicyBinding(
  projectId: string,
  options?: UseMutationOptions<PolicyBinding, Error, CreatePolicyBindingInput>
) {
  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: CreatePolicyBindingInput) =>
      createProjectPolicyBindingService().create(projectId, input) as Promise<PolicyBinding>,
    ...withResourceHandlers(
      policyBindingMutations(projectId).create(toPendingPolicyBinding(projectId)),
      options
    ),
  });
}

export function useUpdateProjectPolicyBinding(
  projectId: string,
  name: string,
  options?: UseMutationOptions<PolicyBinding, Error, UpdatePolicyBindingInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: UpdatePolicyBindingInput) =>
      createProjectPolicyBindingService().update(projectId, name, input) as Promise<PolicyBinding>,
    ...withResourceHandlers(
      policyBindingMutations(projectId).update(toPolicyBindingUpdate(queryClient, projectId, name)),
      options
    ),
  });
}

export function useDeleteProjectPolicyBinding(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (name: string) => createProjectPolicyBindingService().delete(projectId, name),
    ...withResourceHandlers(
      policyBindingMutations(projectId).remove<string>((name) => name),
      options
    ),
  });
}

export function useDeletePolicyBinding(
  orgId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (name: string) => createPolicyBindingService().delete(orgId, name),
    ...withResourceHandlers(
      policyBindingMutations(orgId).remove<string>((name) => name),
      options
    ),
  });
}
