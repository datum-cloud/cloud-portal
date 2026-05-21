import { useApp } from '@/providers/app.provider';
import {
  getActiveProject,
  setActiveProject,
  type ActiveProject,
} from '@/resources/search/search.active-project';
import { useEffect, useMemo } from 'react';

export type ActiveProjectSource = 'route' | 'storage' | 'none';

export interface ActiveProjectState {
  project: ActiveProject | null;
  source: ActiveProjectSource;
}

/**
 * Resolves the active project for search:
 * 1. useApp().project (the route-driven source of truth)
 * 2. localStorage fallback (last-visited project, persists across routes)
 * 3. null / 'none' (no project ever visited)
 *
 * Side effect: when useApp().project is set, we mirror it into
 * localStorage so subsequent navigations to non-project routes can
 * still surface the last-visited project in the search UI.
 */
export function useActiveProject(): ActiveProjectState {
  const { project, organization } = useApp();

  const fromRoute: ActiveProject | null = useMemo(() => {
    if (!project) return null;
    return {
      id: project.name,
      displayName: project.displayName,
      orgId: organization?.name ?? '',
    };
  }, [project, organization]);

  // Mirror route project into localStorage whenever it changes.
  // Only writes when fromRoute is non-null — never clears storage when
  // the user navigates off a project route (preserving last-visited semantics).
  useEffect(() => {
    if (fromRoute) setActiveProject(fromRoute);
  }, [fromRoute]);

  return useMemo(() => {
    if (fromRoute) return { project: fromRoute, source: 'route' };
    const stored = getActiveProject();
    if (stored) return { project: stored, source: 'storage' };
    return { project: null, source: 'none' };
  }, [fromRoute]);
}
