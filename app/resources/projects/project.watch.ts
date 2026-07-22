// app/resources/projects/project.watch.ts
import { toProject } from './project.adapter';
import type { Project } from './project.schema';
import { createProjectService, projectKeys } from './project.service';
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

/** Reasons on Ready=False that mean "still provisioning", not a hard failure. */
const PENDING_READY_REASONS = new Set([
  'Pending',
  'Provisioning',
  'Unknown',
  'Waiting',
  'Creating',
]);

/**
 * Inspect whether a project has finished provisioning.
 *
 * Only the Ready condition matters. Other conditions (e.g. Suspended=False with
 * reason Active / message "Project is active") are healthy signals and must not
 * abort the wait — treating any status=False as failure caused create tasks to
 * fail as soon as Suspended flipped to False.
 *
 * Ready=False during provisioning is pending. Ready=False with a hard failure
 * reason (e.g. ProjectNameConflict) rejects so the task can surface the error.
 */
export function inspectProjectReady(project: Project): Project | 'pending' {
  const status = transformControlPlaneStatus(project.status, {
    includeConditionDetails: true,
    requiredConditions: ['Ready'],
  });

  if (status.status === ControlPlaneStatus.Success) {
    return project;
  }

  const readyCondition = status.conditions?.find((c) => c.type === 'Ready');
  if (
    readyCondition?.status === 'False' &&
    readyCondition.reason &&
    !PENDING_READY_REASONS.has(readyCondition.reason)
  ) {
    throw new Error(readyCondition.message || status.message || 'Resource reconciliation failed');
  }

  return 'pending';
}

/**
 * Resolves when a project is Ready. Polls the current object first so a watch
 * that starts after reconciliation already finished does not hang forever.
 */
export async function awaitProjectReady(
  orgId: string,
  projectName: string,
  seed?: Project
): Promise<Project> {
  if (seed) {
    const ready = inspectProjectReady(seed);
    if (ready !== 'pending') {
      return ready;
    }
  }

  try {
    const current = await createProjectService().get(projectName);
    const ready = inspectProjectReady(current);
    if (ready !== 'pending') {
      return ready;
    }
  } catch {
    // Fall through to the watch — the project may not be readable yet.
  }

  const { promise, cancel } = waitForProjectReady(orgId, projectName);
  try {
    return await promise;
  } finally {
    cancel();
  }
}

/**
 * Wait for project to reach Ready status.
 * Used in task processors for async K8s operations.
 *
 * Returns a cancellable promise that resolves when the project status becomes Ready,
 * or rejects if Ready has a hard failure reason. Call `cancel()` to cleanup the
 * watch subscription (important for task cancellation and timeout handling).
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
        const project = toProject(event.object as ComMiloapisResourcemanagerV1Alpha1Project);
        try {
          const ready = inspectProjectReady(project);
          if (ready !== 'pending') {
            return { resolve: ready };
          }
        } catch (error) {
          return {
            reject: error instanceof Error ? error : new Error('Resource reconciliation failed'),
          };
        }
      }

      return 'continue';
    },
  });
}
