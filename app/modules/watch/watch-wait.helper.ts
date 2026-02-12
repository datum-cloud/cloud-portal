import { watchManager } from '@/modules/watch/watch.manager';
import type { WatchEvent } from '@/modules/watch/watch.types';

export interface WatchWaitOptions {
  resourceType: string;
  orgId?: string;
  projectId?: string;
  namespace?: string;
  name: string;
  onEvent: (
    event: WatchEvent
  ) => 'resolve' | 'reject' | 'continue' | { resolve: unknown } | { reject: Error };
}

/**
 * Generic promise wrapper for K8s Watch API.
 * Subscribes to watch events and resolves/rejects based on callback.
 *
 * Returns a cancellable promise with explicit cleanup control for task queue integration.
 * Each call gets its own watch subscription - canceling one doesn't affect others.
 *
 * @param options.resourceType - K8s resource type (e.g., 'apis/resourcemanager.miloapis.com/v1alpha1/projects')
 * @param options.namespace - Optional namespace for namespaced resources
 * @param options.name - Resource name to watch
 * @param options.onEvent - Callback that processes each event and returns:
 *   - 'resolve': Resolve promise with event.object
 *   - 'reject': Reject promise with generic error
 *   - 'continue': Keep waiting
 *   - { resolve: value }: Resolve promise with custom value
 *   - { reject: error }: Reject promise with custom error
 *
 * @returns Object with:
 *   - `promise`: The watch promise
 *   - `cancel()`: Cleanup function that unsubscribes from watch (safe to call multiple times)
 *
 * @example
 * ```typescript
 * // Inside a task processor
 * processor: async (ctx) => {
 *   const { promise, cancel } = waitForWatch<Project>({
 *     resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects',
 *     name: 'my-project',
 *     onEvent: (event) => {
 *       if (event.type !== 'ADDED' && event.type !== 'MODIFIED') return 'continue';
 *       const project = toProject(event.object);
 *       const status = transformControlPlaneStatus(project);
 *       if (status.status === 'Success') return { resolve: project };
 *       if (status.error) return { reject: new Error(status.error) };
 *       return 'continue';
 *     },
 *   });
 *
 *   // Register cleanup - called automatically on cancel/timeout
 *   ctx.onCancel(cancel);
 *
 *   const project = await promise;
 *   ctx.setResult(project);
 *   ctx.succeed();
 * }
 * ```
 */
export function waitForWatch<T>(options: WatchWaitOptions): {
  promise: Promise<T>;
  cancel: () => void;
} {
  let unsubscribe: (() => void) | null = null;
  let resolved = false;

  const promise = new Promise<T>((resolve, reject) => {
    unsubscribe = watchManager.subscribe(
      {
        resourceType: options.resourceType,
        orgId: options.orgId,
        projectId: options.projectId,
        namespace: options.namespace,
        name: options.name,
      },
      (event: WatchEvent) => {
        if (resolved) return; // Already resolved, ignore late events

        // Handle Watch API errors
        if (event.type === 'ERROR') {
          resolved = true;
          const errorMessage = (event.object as any)?.message || 'Unknown watch error';
          reject(new Error(`Watch error: ${errorMessage}`));
          return;
        }

        // Let consumer decide what to do with this event
        const result = options.onEvent(event);

        if (result === 'continue') {
          return;
        }

        resolved = true;

        if (result === 'resolve') {
          resolve(event.object as T);
          return;
        }

        if (result === 'reject') {
          reject(new Error('Watch failed'));
          return;
        }

        if (typeof result === 'object') {
          if ('resolve' in result) {
            resolve(result.resolve as T);
          } else if ('reject' in result) {
            reject(result.reject);
          }
        }
      }
    );
  });

  return {
    promise,
    cancel: () => {
      if (resolved) return; // Already done, nothing to cancel
      resolved = true; // Prevent late events from resolving
      unsubscribe?.(); // Cleanup watch subscription
    },
  };
}
