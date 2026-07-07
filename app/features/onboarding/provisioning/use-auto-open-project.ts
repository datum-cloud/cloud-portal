import { queryClient } from '@/modules/tanstack/query';
import { projectKeys, waitForProjectAccessReady } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';

type OpenProjectLocationState = {
  openProjectId?: string;
  orgId?: string;
};

/**
 * After onboarding provisioning, project-scoped RBAC can lag behind org access.
 * Route through the org projects page first, then open the project once grants
 * have propagated (without polling cluster-scoped `projects.get`).
 */
export function useAutoOpenProjectFromOnboarding(): void {
  const location = useLocation();
  const navigate = useNavigate();
  const startedRef = useRef(false);

  useEffect(() => {
    const state = location.state as OpenProjectLocationState | null;
    const openProjectId = state?.openProjectId;
    const orgId = state?.orgId;
    if (!openProjectId || !orgId || startedRef.current) {
      return;
    }

    startedRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        await waitForProjectAccessReady(orgId, openProjectId);
        if (cancelled) return;

        queryClient.removeQueries({ queryKey: projectKeys.detail(openProjectId) });

        navigate(getPathWithParams(paths.project.detail.home, { projectId: openProjectId }), {
          replace: true,
          state: { fromOnboarding: true },
        });
      } catch {
        // Permissions still propagating — leave the user on the org projects list.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.state, navigate]);
}
