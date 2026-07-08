import type { ShouldRevalidateFunction } from 'react-router';

/**
 * Skip loader revalidation when navigating within the same project. Pair with
 * React Query `initialData` + watches on list routes so data stays fresh
 * without re-running server loaders on every sidebar click.
 */
export const skipRevalidateWithinSameProject: ShouldRevalidateFunction = ({
  currentParams,
  nextParams,
  defaultShouldRevalidate,
}) => {
  if (currentParams.projectId && currentParams.projectId === nextParams.projectId) {
    return false;
  }
  return defaultShouldRevalidate;
};

/**
 * Like {@link skipRevalidateWithinSameProject} but also requires the given
 * resource URL param (e.g. `proxyId`) to be unchanged — for detail layouts
 * where overview/activity/settings tabs share one loader.
 */
export function skipRevalidateWithinSameProjectResource(
  resourceParam: string
): ShouldRevalidateFunction {
  return ({ currentParams, nextParams, defaultShouldRevalidate }) => {
    if (
      currentParams.projectId &&
      currentParams.projectId === nextParams.projectId &&
      currentParams[resourceParam] === nextParams[resourceParam]
    ) {
      return false;
    }
    return defaultShouldRevalidate;
  };
}
