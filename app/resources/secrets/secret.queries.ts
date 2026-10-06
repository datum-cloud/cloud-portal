import type { Secret, CreateSecretInput, UpdateSecretInput } from './secret.schema';
import { SECRET_SYNC_KIND, createSecretService, secretKeys } from './secret.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import {
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import { withAllowanceRefresh } from '@/resources/allowance-buckets';
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useSecrets(
  projectId: string,
  options?: Omit<UseQueryOptions<Secret[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: secretKeys.list(projectId),
    queryFn: () => createSecretService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useSecret(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<Secret>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: secretKeys.detail(projectId, name),
    queryFn: () => createSecretService().get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

/** Secrets are watched: mutations write the list and never invalidate it. */
export function secretMutations(projectId: string) {
  return defineResourceMutations<Secret>({
    kind: SECRET_SYNC_KIND,
    scope: projectId,
    keys: {
      lists: secretKeys.list(projectId),
      detail: (name) => secretKeys.detail(projectId, name),
    },
    getName: (secret) => secret.name,
    getMeta: (secret) => ({
      name: secret.name,
      resourceVersion: secret.resourceVersion,
      deletionTimestamp: secret.deletionTimestamp,
    }),
    watched: true,
  });
}

/** Secret values never enter the cache. */
export function toPendingSecret(input: CreateSecretInput): Secret {
  return {
    uid: input.name,
    name: input.name,
    namespace: 'default',
    createdAt: new Date(),
    type: input.type,
    data: input.variables.map((variable) => variable.key),
  };
}

export function useCreateSecret(
  projectId: string,
  options?: UseMutationOptions<Secret, Error, CreateSecretInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: CreateSecretInput) =>
      createSecretService().create(projectId, input) as Promise<Secret>,
    ...withResourceHandlers(
      secretMutations(projectId).create(toPendingSecret),
      withAllowanceRefresh(options, queryClient)
    ),
  });
}

export function useUpdateSecret(
  projectId: string,
  name: string,
  options?: UseMutationOptions<Secret, Error, UpdateSecretInput>
) {
  const queryClient = useQueryClient();
  const handlers = secretMutations(projectId).update<UpdateSecretInput>(() =>
    queryClient.getQueryData<Secret>(secretKeys.detail(projectId, name))
  );

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: UpdateSecretInput) =>
      createSecretService().update(projectId, name, input) as Promise<Secret>,
    ...withResourceHandlers(handlers, options),
  });
}

export function useDeleteSecret(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (name: string) => createSecretService().delete(projectId, name),
    ...withResourceHandlers(
      secretMutations(projectId).remove<string>((name) => name),
      withAllowanceRefresh(options, queryClient)
    ),
  });
}
