import { PROXY_URL } from '@/modules/axios/axios.client';
import { addBreadcrumb } from '@/modules/sentry/capture';
import { buildWatchUpstreamPath } from '@/modules/watch/watch-path';
import { watchManager } from '@/modules/watch/watch.manager';
import type { WatchEvent } from '@/modules/watch/watch.types';

export interface WatchWaitOptions {
  resourceType: string;
  orgId?: string;
  projectId?: string;
  namespace?: string;
  /**
   * Resource name for a single-object watch. Leave undefined to watch the
   * whole collection and filter inside `onEvent` — useful when the
   * resource you're waiting on is created by a controller and you don't
   * know its name in advance (e.g. waiting for a child `StripePaymentMethod`
   * to come up under a parent `PaymentMethod`).
   */
  name?: string;
  onEvent: (
    event: WatchEvent
  ) => 'resolve' | 'reject' | 'continue' | { resolve: unknown } | { reject: Error };
}

type WatchedScope = Omit<WatchWaitOptions, 'onEvent'>;

function errorMessageOf(object: unknown): string {
  const message =
    typeof object === 'object' && object !== null
      ? (object as { message?: unknown }).message
      : undefined;
  return typeof message === 'string' && message ? message : 'Unknown watch error';
}

async function listWatched(options: WatchedScope): Promise<unknown[]> {
  const params = new URLSearchParams();
  if (options.name) params.set('fieldSelector', `metadata.name=${options.name}`);
  const query = params.toString();
  const path = buildWatchUpstreamPath(options);
  const response = await fetch(`${PROXY_URL}${path}${query ? `?${query}` : ''}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`list failed: ${response.status}`);
  const body = (await response.json()) as { items?: unknown[] };
  return body.items ?? [];
}

/**
 * Generic promise wrapper for K8s Watch API.
 * Subscribes to watch events and resolves/rejects based on callback.
 *
 * The hub does not replay missed events, so on RESYNC the wait lists the
 * watched objects and runs each through `onEvent` as MODIFIED.
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
 *   - `cancel()`: Stops waiting and unsubscribes (safe to call multiple times).
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

  const finish = () => {
    resolved = true;
    unsubscribe?.();
    unsubscribe = null;
  };

  const promise = new Promise<T>((resolve, reject) => {
    const evaluate = (event: WatchEvent) => {
      if (resolved) return; // Already resolved, ignore late events

      // Handle Watch API errors
      if (event.type === 'ERROR') {
        finish();
        reject(new Error(`Watch error: ${errorMessageOf(event.object)}`));
        return;
      }

      // Let consumer decide what to do with this event
      const result = options.onEvent(event);

      if (result === 'continue') {
        return;
      }

      finish();

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
    };

    let listing = false;
    let listAgain = false;
    const relist = async () => {
      if (listing) {
        listAgain = true;
        return;
      }
      listing = true;
      try {
        for (const object of await listWatched(options)) {
          evaluate({ type: 'MODIFIED', object });
        }
      } catch (err) {
        // The next event or resync tries again.
        addBreadcrumb('warn', 'watch wait list after resync failed', 'watch', {
          resourceType: options.resourceType,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        listing = false;
        if (listAgain && !resolved) {
          listAgain = false;
          void relist();
        }
      }
    };

    unsubscribe = watchManager.subscribe(
      {
        resourceType: options.resourceType,
        orgId: options.orgId,
        projectId: options.projectId,
        namespace: options.namespace,
        name: options.name,
      },
      (event: WatchEvent) => {
        if (resolved) return;
        if (event.type === 'RESYNC') {
          void relist();
          return;
        }
        evaluate(event);
      }
    );
  });

  return {
    promise,
    cancel: finish,
  };
}
