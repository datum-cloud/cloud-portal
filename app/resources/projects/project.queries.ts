import type {
  Project,
  ProjectList,
  CreateProjectInput,
  UpdateProjectInput,
} from './project.schema';
import { createProjectService, projectKeys } from './project.service';
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
    },
  });
}

export function useUpdateProject(
  name: string,
  options?: UseMutationOptions<Project, Error, UpdateProjectInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectInput) => createProjectService().update(name, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache with server response - Watch handles list sync
      queryClient.setQueryData(projectKeys.detail(name), data);

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
      // Cancel in-flight queries - Watch handles list update
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(name) });

      options?.onSuccess?.(...args);
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
