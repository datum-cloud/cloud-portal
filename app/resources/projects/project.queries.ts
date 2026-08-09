import { patchProjectListDeleting, markSelfDeleteNavigation } from './project.helpers';
import type {
  Project,
  ProjectList,
  CreateProjectInput,
  UpdateProjectInput,
} from './project.schema';
import { createProjectService, projectKeys } from './project.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import { invalidateAllowanceBuckets } from '@/resources/allowance-buckets';
import type { PaginationParams } from '@/resources/base/base.schema';
import {
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

export function useCreateProject(options?: UseMutationOptions<Project, Error, CreateProjectInput>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProjectService().create(input),
    ...options,
    onSuccess: (...args) => {
      const [newProject] = args;
      // Set detail cache - Watch handles list update
      queryClient.setQueryData(projectKeys.detail(newProject.name), newProject);

      options?.onSuccess?.(...args);
      void invalidateAllowanceBuckets(queryClient);
    },
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
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache with server response
      queryClient.setQueryData(projectKeys.detail(name), data);

      // Patch any cached org project lists so switchers/tables don't keep the
      // old display name until the next refetch (list watches are not always mounted).
      if (data.organizationId) {
        queryClient.setQueriesData<ProjectList>(
          { queryKey: [...projectKeys.lists(), data.organizationId] },
          (old) => {
            if (!old?.items) return old;
            return {
              ...old,
              items: old.items.map((item) => (item.name === data.name ? data : item)),
            };
          }
        );
      }

      options?.onSuccess?.(...args);
    },
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

      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void invalidateAllowanceBuckets(queryClient);
    },
    onSettled: (...args) => {
      options?.onSettled?.(...args);
    },
  });
}
