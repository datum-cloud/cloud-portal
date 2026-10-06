import { markSelfDeleteNavigation, patchProjectListDeleting, projectMeta } from './project.helpers';
import type {
  Project,
  ProjectList,
  CreateProjectInput,
  UpdateProjectInput,
} from './project.schema';
import { PROJECT_SYNC_KIND, createProjectService, projectKeys } from './project.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import {
  defineResourceMutations,
  withResourceHandlers,
  type MutationHandlers,
} from '@/modules/watch/define-resource-mutations';
import { invalidateAllowanceBuckets, withAllowanceRefresh } from '@/resources/allowance-buckets';
import type { PaginationParams } from '@/resources/base/base.schema';
import {
  type QueryClient,
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useProjects(
  orgId: string,
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<ProjectList>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectKeys.list(orgId, params),
    queryFn: () => createProjectService().list(orgId, params),
    enabled: !!orgId,
    ...options,
  });
}

export function useProject(
  name: string,
  options?: Omit<UseQueryOptions<Project>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectKeys.detail(name),
    queryFn: () => createProjectService().get(name),
    enabled: !!name,
    ...options,
  });
}

/** Projects are watched: create and update write the lists and never invalidate them. */
function projectMutations(orgId: string) {
  return defineResourceMutations<Project>({
    kind: PROJECT_SYNC_KIND,
    scope: orgId,
    keys: {
      lists: [...projectKeys.lists(), orgId],
      detail: (name) => projectKeys.detail(name),
    },
    getName: (project) => project.name,
    getMeta: projectMeta,
    watched: true,
  });
}

/** The org is only known per mutation, from the variables or the cached project. */
function perOrg<T, V>(
  orgOf: (vars: V, data?: T) => string,
  pick: (mutations: ReturnType<typeof projectMutations>) => MutationHandlers<T, V>
): MutationHandlers<T, V> {
  const handlersFor = (vars: V, data?: T) => pick(projectMutations(orgOf(vars, data)));
  return {
    onMutate: (vars, context) => handlersFor(vars).onMutate!(vars, context),
    onSuccess: (data, vars, ctx, context) =>
      handlersFor(vars, data).onSuccess!(data, vars, ctx, context),
    onError: (error, vars, ctx, context) => handlersFor(vars).onError!(error, vars, ctx, context),
    onSettled: (data, error, vars, ctx, context) =>
      handlersFor(vars, data).onSettled!(data, error, vars, ctx, context),
  };
}

function toPendingProject(input: CreateProjectInput, pendingName: string): Project {
  return {
    uid: pendingName,
    name: pendingName,
    displayName: input.description ?? '',
    description: input.description,
    resourceVersion: '',
    createdAt: new Date(),
    organizationId: input.organizationId,
    status: undefined,
  };
}

export function projectCreateHandlers() {
  return perOrg<Project, CreateProjectInput>(
    (input) => input.organizationId,
    (mutations) => mutations.create(toPendingProject)
  );
}

/** Project names are unique across orgs, so any org's list row identifies the org. */
function findCachedProject(
  queryClient: QueryClient,
  name: string
): { project: Project; orgId: string } | undefined {
  const detail = queryClient.getQueryData<Project>(projectKeys.detail(name));
  if (detail?.organizationId) return { project: detail, orgId: detail.organizationId };
  const orgIndex = projectKeys.lists().length;
  for (const [queryKey, data] of queryClient.getQueriesData<ProjectList | Project[]>({
    queryKey: projectKeys.lists(),
  })) {
    const rows = Array.isArray(data) ? data : data?.items;
    const row = rows?.find((project) => project.name === name);
    if (row) return { project: detail ?? row, orgId: String(queryKey[orgIndex] ?? '') };
  }
  return detail ? { project: detail, orgId: '' } : undefined;
}

export function projectUpdateHandlers(queryClient: QueryClient, name: string) {
  const cached = () => findCachedProject(queryClient, name);
  return perOrg<Project, UpdateProjectInput>(
    (_input, data) => data?.organizationId || cached()?.orgId || '',
    (mutations) =>
      mutations.update((input) => {
        const current = cached()?.project;
        if (!current) return undefined;
        return { ...current, displayName: input.description ?? current.displayName };
      })
  );
}

export function useCreateProject(options?: UseMutationOptions<Project, Error, CreateProjectInput>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProjectService().create(input),
    ...withResourceHandlers(projectCreateHandlers(), withAllowanceRefresh(options, queryClient)),
  });
}

export function useUpdateProject(
  name: string,
  options?: UseMutationOptions<Project, Error, UpdateProjectInput>
) {
  const queryClient = useQueryClient();

  // The project settings "Save". Only call site is the general settings card,
  // rendered inside ProjectProvider — defense in depth behind the guard on that
  // button. useCreateProject / useDeleteProject stay raw: creation takes no
  // project argument, and deletes are never gated.
  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: UpdateProjectInput) => createProjectService().update(name, input),
    ...withResourceHandlers(projectUpdateHandlers(queryClient, name), options),
  });
}

export function useDeleteProject(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createProjectService().delete(name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(name) });

      const project = queryClient.getQueryData<Project>(projectKeys.detail(name));
      const deletedAt = new Date();

      // Navigate before list patch so the layout deleting-redirect does not race
      // self-delete. Skip marking detail cache deleting — watch/refetch owns that.
      markSelfDeleteNavigation(name);
      options?.onSuccess?.(...args);

      queryClient.setQueriesData<ProjectList>({ queryKey: projectKeys.lists() }, (old) =>
        patchProjectListDeleting(old, name, project, deletedAt)
      );

      // Exception to watch-or-invalidate: the projects page draws its deleting
      // card from deletionTimestamp, and lists no watch covers must refetch.
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void invalidateAllowanceBuckets(queryClient);
    },
    onSettled: (...args) => {
      options?.onSettled?.(...args);
    },
  });
}
