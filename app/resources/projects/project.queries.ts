import type {
  Project,
  ProjectList,
  CreateProjectInput,
  UpdateProjectInput,
} from './project.schema';
import { createProjectService, projectKeys } from './project.service';
import { useServiceContext } from '@/providers/service.provider';
import type { PaginationParams } from '@/resources/base/base.schema';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

export function useProjects(
  orgId: string,
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<ProjectList>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createProjectService(ctx);

  return useQuery({
    queryKey: projectKeys.list(orgId, params),
    queryFn: () => service.list(orgId, params),
    enabled: !!orgId,
    ...options,
  });
}

export function useProject(
  name: string,
  options?: Omit<UseQueryOptions<Project>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createProjectService(ctx);

  return useQuery({
    queryKey: projectKeys.detail(name),
    queryFn: () => service.get(name),
    enabled: !!name,
    ...options,
  });
}

export function useCreateProject(options?: UseMutationOptions<Project, Error, CreateProjectInput>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createProjectService(ctx);

  return useMutation({
    mutationFn: (input: CreateProjectInput) => service.create(input),
    onSuccess: (newProject) => {
      // Force refetch to show updates immediately (watch will keep it in sync after)
      queryClient.refetchQueries({
        queryKey: projectKeys.lists(),
        type: 'active',
      });
      queryClient.setQueryData(projectKeys.detail(newProject.name), newProject);
    },
    onSettled: () => {
      // Invalidate to mark stale for background refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    ...options,
  });
}

export function useUpdateProject(
  name: string,
  options?: UseMutationOptions<Project, Error, UpdateProjectInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createProjectService(ctx);

  return useMutation({
    mutationFn: (input: UpdateProjectInput) => service.update(name, input),
    onSuccess: (data) => {
      // Update cache with actual response from server
      queryClient.setQueryData(projectKeys.detail(name), data);

      // Force refetch list to show updates immediately (watch will keep it in sync after)
      queryClient.refetchQueries({
        queryKey: projectKeys.lists(),
        type: 'active',
      });
    },
    onSettled: () => {
      // Invalidate to mark stale for background refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(name) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    ...options,
  });
}

type DeleteProjectContext = {
  previousLists: Map<string, ProjectList>;
};

export function useDeleteProject(
  options?: UseMutationOptions<void, Error, string, DeleteProjectContext>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createProjectService(ctx);

  const customCallbacks = {
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    onSettled: options?.onSettled,
  };

  return useMutation<void, Error, string, DeleteProjectContext>({
    mutationFn: (name: string) => service.delete(name),
    onMutate: async (name) => {
      // Cancel outgoing refetches for all project lists
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

      // Snapshot previous values for all project list queries
      const previousLists = new Map<string, ProjectList>();
      queryClient
        .getQueriesData<ProjectList>({ queryKey: projectKeys.lists() })
        .forEach(([key, data]) => {
          if (data) {
            previousLists.set(JSON.stringify(key), data);
          }
        });

      // Optimistically remove the project from all list caches
      queryClient.setQueriesData<ProjectList>({ queryKey: projectKeys.lists() }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((project) => project.name !== name),
        };
      });

      return { previousLists };
    },
    onError: (error, name, context) => {
      // Rollback on error - restore all previous lists
      if (context?.previousLists) {
        context.previousLists.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }

      // Call custom onError if provided
      (customCallbacks.onError as any)?.(error, name, undefined, {});
    },
    onSuccess: (data, name) => {
      // Remove the detail query from cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(name) });

      // Call custom onSuccess if provided
      (customCallbacks.onSuccess as any)?.(data, name, undefined, {});
    },
    onSettled: (data, error, name) => {
      // Refetch to ensure we're in sync with server (watch will also update)
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      // Call custom onSettled if provided
      (customCallbacks.onSettled as any)?.(data, error, name, undefined, {});
    },
  });
}

/**
 * Hydrates React Query cache with SSR data for projects list.
 */
export function useHydrateProjects(orgId: string, initialData: Project[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(projectKeys.list(orgId), {
        items: initialData,
        hasMore: false,
        nextCursor: null,
      });
      hydrated.current = true;
    }
  }, [queryClient, orgId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single project.
 */
export function useHydrateProject(name: string, initialData: Project) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(projectKeys.detail(name), initialData);
      hydrated.current = true;
    }
  }, [queryClient, name, initialData]);
}
