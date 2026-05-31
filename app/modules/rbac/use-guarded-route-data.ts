import type { DslLoaderData } from './types';
import { useRouteLoaderData } from 'react-router';

export function assertNotRestricted<TData, TCompanions>(
  loaderData: DslLoaderData<TData, TCompanions>
): { data: TData; companions: TCompanions } {
  if (loaderData.restricted) {
    throw new Error(
      'useGuardedRouteData called on restricted loader data. The parent route should have rendered <RestrictedState> before reaching child consumers.'
    );
  }
  return { data: loaderData.data, companions: loaderData.companions };
}

/**
 * Typed loader-data reader for child routes whose ancestor used
 * `defineResourceRoute`. Throws if called from a restricted route — that
 * indicates a routing bug (the parent should have short-circuited).
 */
export function useGuardedRouteData<TData, TCompanions>(
  routeId: string
): {
  data: TData;
  companions: TCompanions;
} {
  const loaderData = useRouteLoaderData(routeId) as DslLoaderData<TData, TCompanions> | undefined;
  if (!loaderData) {
    throw new Error(`useGuardedRouteData: no loader data for route id '${routeId}'`);
  }
  return assertNotRestricted(loaderData);
}
