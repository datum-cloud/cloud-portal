// app/resources/projects/project.watch.ts
import { toProject } from './project.adapter';
import type { Project } from './project.schema';
import { projectKeys } from './project.service';
import type { ComMiloapisResourcemanagerV1Alpha1Project } from '@/modules/control-plane/resource-manager';
import { useResourceWatch } from '@/modules/watch';
import { waitForWatch } from '@/modules/watch/watch-wait.helper';
import { ControlPlaneStatus } from '@/resources/base';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
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
    orgId,
    queryKey,
    transform: (item) => toProject(item as ComMiloapisResourcemanagerV1Alpha1Project),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single project for real-time updates.
 * Projects are org-scoped resources accessed via organization control-plane.
 *
 * @example
 * ```tsx
 * function ProjectDetailPage() {
 *   const { data } = useProject(projectName);
 *
 *   // Subscribe to live updates
 *   useProjectWatch(orgId, projectName);
 *
 *   return <ProjectDetail project={data} />;
 * }
 * ```
 */
export function useProjectWatch(orgId: string, name: string, options?: { enabled?: boolean }) {
  const queryKey = useMemo(() => projectKeys.detail(name), [name]);

  return useResourceWatch<Project>({
    resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects',
    orgId,
    name,
    queryKey,
    transform: (item) => toProject(item as ComMiloapisResourcemanagerV1Alpha1Project),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Wait for project to reach Ready status.
 * Used in task processors for async K8s operations.
 *
 * Returns a cancellable promise that resolves when the project status becomes Ready,
 * or rejects if the project has an error condition. Call `cancel()` to cleanup the
 * watch subscription (important for task cancellation and timeout handling).
 *
 * @param orgId - Organization ID (used to scope the watch through org control-plane)
 * @param projectName - Name of the project to watch
 * @returns Object with `promise` and `cancel()` function
 *
 * @example
 * ```typescript
 * // Inside a task processor with automatic cleanup
 * processor: async (ctx) => {
 *   // 1. Create project via API
 *   await createProject({ body: projectSpec });
 *
 *   // 2. Wait for K8s reconciliation with auto cleanup
 *   const { promise, cancel } = waitForProjectReady(orgId, projectName);
 *   ctx.onCancel(cancel); // Cleanup called automatically on cancel/timeout
 *
 *   const project = await promise;
 *
 *   // 3. Task completes when Ready
 *   ctx.setResult(project);
 *   ctx.succeed();
 * }
 * ```
 */
export function waitForProjectReady(
  orgId: string,
  projectName: string
): {
  promise: Promise<Project>;
  cancel: () => void;
} {
  return waitForWatch<Project>({
    resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects',
    orgId,
    name: projectName,
    onEvent: (event) => {
      if (event.type === 'ADDED' || event.type === 'MODIFIED') {
        // Transform raw K8s object to domain type
        const project = toProject(event.object as ComMiloapisResourcemanagerV1Alpha1Project);

        // Check status with condition details for error detection
        const status = transformControlPlaneStatus(project.status, {
          includeConditionDetails: true,
        });

        if (status.status === ControlPlaneStatus.Success) {
          return { resolve: project };
        }

        // Check conditions for error states (status is Pending when not all conditions met)
        const failedCondition = status.conditions?.find((c) => c.status === 'False');
        if (failedCondition) {
          return {
            reject: new Error(
              failedCondition.message || status.message || 'Resource reconciliation failed'
            ),
          };
        }
      }

      // Keep waiting if status is Pending without error
      return 'continue';
    },
  });
}
