import type { DslLoaderData } from '../types';
import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

export interface GuardedPageProps<TData, TCompanions> {
  loaderData: DslLoaderData<TData, TCompanions>;
  restrictedTitle?: string;
  restrictedMessage: string;
  seedCache?: (ctx: { data: TData; companions: TCompanions }) => Array<[QueryKey, unknown]>;
  children: (data: TData, companions: TCompanions) => ReactNode;
}

/**
 * Page-level wrapper used by `defineResourceRoute.Page` and any route that wants
 * the canonical restricted-render + cache-seeding behavior without the full DSL.
 *
 * - restricted loader data → RestrictedState (no fetch, no skeleton).
 * - allowed loader data    → seeds the React Query cache from `seedCache`,
 *                            then calls the children render prop with the data.
 *
 * Seed re-run behavior: the cache-seeding effect fires whenever `loaderData`
 * or `seedCache` identity changes. React Router revalidations produce a new
 * `loaderData` reference on every loader run, so seeding re-fires on each
 * revalidation. This is intentional — fresh loader output should hydrate the
 * cache so child consumers via `useQuery` see the latest values immediately.
 * `setQueryData` is idempotent, so identical re-seeds are harmless. If a
 * caller wants strict reference stability for `seedCache` (e.g. because their
 * factory has side effects), wrap it in `useCallback` at the call site.
 */
export function GuardedPage<TData, TCompanions>(props: GuardedPageProps<TData, TCompanions>) {
  const { loaderData, restrictedTitle, restrictedMessage, seedCache, children } = props;
  const qc = useQueryClient();

  // Always call the effect (hook ordering) but no-op on restricted.
  useEffect(() => {
    if (loaderData.restricted) return;
    if (!seedCache) return;
    const entries = seedCache({ data: loaderData.data, companions: loaderData.companions });
    for (const [queryKey, value] of entries) {
      qc.setQueryData(queryKey, value);
    }
  }, [loaderData, seedCache, qc]);

  if (loaderData.restricted) {
    return <RestrictedState title={restrictedTitle} message={restrictedMessage} />;
  }

  return <>{children(loaderData.data, loaderData.companions)}</>;
}
