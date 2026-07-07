import type { DslLoaderData } from '@/modules/rbac/types';
import { queryClient } from '@/modules/tanstack/query';
import type { QueryKey } from '@tanstack/react-query';
import type { ClientLoaderFunctionArgs } from 'react-router';

type ListLoaderEnvelope<TData> = DslLoaderData<TData, Record<string, never>>;

/** Cached list data that mutations have not marked stale via invalidateQueries. */
export function getValidCachedQueryData<TData>(queryKey: QueryKey): TData | undefined {
  const state = queryClient.getQueryState<TData>(queryKey);
  if (state?.data === undefined || state.isInvalidated) {
    return undefined;
  }
  return state.data;
}

/**
 * Client loader for project list routes. React Router framework mode (SSR)
 * always re-runs server loaders when switching between sibling routes, even
 * when `shouldRevalidate` returns false. This client loader serves cached
 * loader data on revisit so sidebar navigation stays instant.
 *
 * Reads from the same React Query keys that resource mutations invalidate,
 * so deletes/creates are reflected after navigation.
 */
export function createProjectListClientLoader<TData>(
  resolveCached: (projectId: string) => TData | undefined
) {
  async function clientLoader({ serverLoader, params }: ClientLoaderFunctionArgs) {
    const projectId = params.projectId;
    if (projectId) {
      const cached = resolveCached(projectId);
      if (cached !== undefined) {
        return {
          restricted: false,
          data: cached,
          companions: {},
        } satisfies ListLoaderEnvelope<TData>;
      }
    }

    return serverLoader();
  }

  clientLoader.hydrate = true as const;
  return clientLoader;
}

/** Convenience wrapper for list routes whose loader data matches a single query key. */
export function createProjectListClientLoaderFromQueryKey<TData>(
  queryKey: (projectId: string) => QueryKey
) {
  return createProjectListClientLoader<TData>((projectId) =>
    getValidCachedQueryData<TData>(queryKey(projectId))
  );
}
