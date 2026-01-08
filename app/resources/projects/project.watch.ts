// app/resources/projects/project.watch.ts
import { toProject } from './project.adapter';
import type { Project } from './project.schema';
import { projectKeys } from './project.service';
import type { ComMiloapisResourcemanagerV1Alpha1Project } from '@/modules/control-plane/resource-manager';
import { useResourceWatch } from '@/modules/watch';
import { useMemo } from 'react';

/**
 * Watch projects list for real-time updates.
 *
 * @example
 * ```tsx
 * function ProjectsPage() {
 *   const { data } = useProjects(orgId);
 *
 *   // Subscribe to live updates
 *   useProjectsWatch(orgId);
 *
 *   return <ProjectTable projects={data?.items ?? []} />;
 * }
 * ```
 */
export function useProjectsWatch(orgId: string, options?: { enabled?: boolean }) {
  const queryKey = useMemo(() => projectKeys.list(orgId), [orgId]);

  return useResourceWatch<Project>({
    resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects',
    namespace: orgId,
    queryKey,
    transform: (item) => toProject(item as ComMiloapisResourcemanagerV1Alpha1Project),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single project for real-time updates.
 * Projects are cluster-scoped resources.
 *
 * @example
 * ```tsx
 * function ProjectDetailPage() {
 *   const { data } = useProject(projectName);
 *
 *   // Subscribe to live updates
 *   useProjectWatch(projectName);
 *
 *   return <ProjectDetail project={data} />;
 * }
 * ```
 */
export function useProjectWatch(name: string, options?: { enabled?: boolean }) {
  const queryKey = useMemo(() => projectKeys.detail(name), [name]);

  return useResourceWatch<Project>({
    resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects',
    namespace: undefined, // Cluster-scoped resource, no namespace
    name,
    queryKey,
    transform: (item) => toProject(item as ComMiloapisResourcemanagerV1Alpha1Project),
    enabled: options?.enabled ?? true,
  });
}
