import { createProjectService } from './project.service';
import { getRequestContext, oncePerRequest } from '@/modules/axios/request-context';
import type { Project } from '@/resources/projects/project.schema';
import { requestCacheKeys } from '@/utils/request-cache-keys';

/**
 * Fetch a project once per request.
 *
 * `projectLegacySetupMiddleware` fetches the project purely to resolve its
 * owning organization, and the project detail layout loader then fetches the
 * identical record a moment later — two sequential round trips for one row. This
 * collapses them, following the same per-request-cache arrangement as
 * `RequestContext.cachedUser` (written by authMiddleware, read by the private
 * layout loader).
 *
 * Both reads happen inside a single request, so there is no staleness window:
 * the middleware runs immediately before the loader it feeds. Outside a request
 * context (no AsyncLocalStorage store) this degrades to a plain fetch.
 *
 * The fetch goes through `oncePerRequest` rather than relying on
 * `cachedProject` alone, because a sibling route loader can start before the
 * middleware's fetch resolves and would otherwise miss the cache entirely.
 *
 * Deliberately NOT re-exported from `app/resources/projects/index.ts` — that
 * barrel is imported by client-side query and watch hooks, and
 * `request-context.ts` pulls in `async_hooks`.
 */
export async function getProjectForRequest(projectId: string): Promise<Project> {
  const ctx = getRequestContext();
  // Match on `name` so a request that touches two projects (or a stale entry
  // from an earlier middleware hop) can never serve the wrong record.
  if (ctx?.cachedProject?.name === projectId) {
    return ctx.cachedProject;
  }

  const project = await oncePerRequest(requestCacheKeys.project(projectId), () =>
    createProjectService().get(projectId)
  );
  if (ctx) {
    ctx.cachedProject = project;
  }
  return project;
}
